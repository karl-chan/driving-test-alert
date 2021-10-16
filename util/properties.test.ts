import Properties from './properties'

describe('properties', () => {
  test('should return undefined for missing property', () => {
    expect(Properties.get('missing.property')).toBeUndefined()
  })
  test('should return property from system environment', () => {
    expect(Properties.get('NODE_ENV')).toMatch(/test|production/)
  })
  test('should return property from config file', () => {
    expect(Properties.get('log.level')).toBe('debug')
  })
})
