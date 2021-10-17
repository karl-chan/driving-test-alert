import Properties from '../util/properties'
import { DVSA } from './DVSA'

jest.setTimeout(120000) // 2 minutes

describe('DVSA', () => {
  test('login is successful with valid license', async () => {
    const dvsa = new DVSA({
      drivingLicense: Properties.get('dvsa.test.license'),
      headless: false
    })
    const success = await dvsa.login()
    await dvsa.close()
    expect(success).toBeTrue()
  })

  test('login fails with invalid license', async () => {
    const dvsa = new DVSA({
      drivingLicense: 'invalid',
      headless: false
    })
    const success = await dvsa.login()
    await dvsa.close()
    expect(success).toBeFalse()
  })

  test('checkAvailability is successful with valid license', async () => {
    const dvsa = new DVSA({
      drivingLicense: Properties.get('dvsa.test.license'),
      headless: false
    })
    await dvsa.login()
    const dvsaTimeSlots = await dvsa.checkAvailability(Properties.get('dvsa.test.postcode'))
    await dvsa.close()
    expect(dvsaTimeSlots).toBeArray()
  })
})
