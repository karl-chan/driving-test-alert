import { Promise } from 'bluebird'
import { format, fromUnixTime } from 'date-fns'
import playwright, { Browser, Page } from 'playwright'

export interface DVSATimeSlot {
  name: string,
  address: string,
  dates: Date[]
}
export class DVSA {
  private drivingLicense: string
  private headless: boolean

  private browser: Browser
  private page: Page

  constructor ({ drivingLicense, headless = false }: {
    drivingLicense: string,
    headless?: boolean
  }) {
    this.drivingLicense = drivingLicense
    this.headless = headless
  }

  private async click (selector: string): Promise<void> {
    await this.page.click(selector)
  }

  private async type (selector: string, text: string): Promise<void> {
    await this.page.type(selector, text, { delay: 100 })
  }

  private async simulateUserSleep (minDelay: number = 0): Promise<void> {
    await new Promise(resolve =>
      setTimeout(
        resolve,
        Math.random() * 5000 + minDelay)
    )
  }

  private async getPageTitle (): Promise<string> {
    return this.getSelectorText('.page-header h1')
  }

  private async getSelectorText (selector: string): Promise<string> {
    return this.page.$eval(selector, element => element.textContent)
  }

  async login (): Promise<boolean> {
    this.browser = await playwright.firefox.launch({
      headless: this.headless
    })
    this.page = await this.browser.newPage()

    // At Page: Blank
    await this.simulateUserSleep()

    // At page: CloudFlare
    // Sometimes cloudflare gets stuck on page load, but all we need is their cookie, so continue once DOM is loaded.
    await this.page.goto('https://www.cloudflare.com/', { waitUntil: 'domcontentloaded' })
    await this.simulateUserSleep()

    // At page: DVSA
    await this.page.goto('https://driverpracticaltest.dvsa.gov.uk/application')
    await this.simulateUserSleep()

    // At page: Queue-it
    // The queue-it page is shown non-deterministic, wait for it to redirect back to DVSA page
    if (this.page.url().includes('queue.driverpracticaltest.dvsa.gov.uk')) {
      await this.page.waitForURL(/^https:\/\/driverpracticaltest.dvsa.gov.uk\/application.*/)
    }

    // At Page: Choose type of test
    await this.click('#test-type-car')
    await this.simulateUserSleep()

    // At Page: Licence details - Car test
    await this.type('#driving-licence', this.drivingLicense)
    await this.click('#extended-test-no')
    await this.click('#special-needs-none')
    await this.click('#driving-licence-submit')
    await this.simulateUserSleep()

    // At Page: Test date - Car test
    const errorMessage = await this.page.$('#driverLicenceNumber-invalid')
    const isLoggedIn = errorMessage === null
    return isLoggedIn
  }

  async checkAvailability (postcode: string, checkNumNearestTestCenters = 80): Promise<DVSATimeSlot[]> {
    // Preconditions - Check state
    if (await this.getPageTitle() === 'Test date - Car test') {
      // At Page: Test date - Car test
      await this.type('#test-choice-calendar', format(new Date(), 'dd/MM/yy'))
      await this.click('#driving-licence-submit')
      await this.simulateUserSleep()
    }

    if (await this.getPageTitle() !== 'Test centre - Car test') {
      throw new Error('Not logged in')
    }
    // At Page: Test centre - Car test
    await this.type('#test-centres-input', postcode)
    await this.click('#test-centres-submit')
    await this.simulateUserSleep()

    // At search results
    const searchResultsText = await this.getSelectorText('#search-results > hgroup > h2')
    if (searchResultsText !== 'Your search results') {
      throw new Error('No search results found')
    }

    for (let i = 0; i < Math.ceil(checkNumNearestTestCenters / 4); i++) {
      await this.click('#fetch-more-centres')
    }

    const results = await this.page.$$('.test-centre-details-link')
    const availableResults = await Promise.filter(results, async result => {
      const status = await result.$eval('h5', node => node.textContent)
      return status.includes('available tests around')
    })

    const dvsaTimeSlots = await Promise.mapSeries(availableResults, async result => {
      const name = await result.$eval('h4', node => node.textContent)
      const address = await result.$eval('address', node => node.textContent)

      // Open new tab and get actual available time slots
      const href = await result.$eval('a', node => node.href)
      const tab = await this.browser.newPage()
      await tab.goto(`https://driverpracticaltest.dvsa.gov.uk${href}`)
      await this.simulateUserSleep()

      const cells = await tab.$$('.SlotPicker-slot-label')
      const dates = await Promise.map(cells, async cell => {
        // unix time in seconds
        const timestamp = await cell.$eval('.SlotPicker-slot', node => +node.getAttribute('value') / 1000)
        return fromUnixTime(timestamp)
      })

      return {
        name,
        address,
        dates
      }
    })

    return dvsaTimeSlots
      .filter(slot => slot.dates.length) // discard invalid results with empty slots
  }

  async close (): Promise<void> {
    await this.page?.close()
    await this.browser?.close()
  }
}
