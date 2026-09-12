import { describe, expect, it } from 'vitest'
import { useSite } from '../app/composables/useSite'

describe('useSite', () => {
  it('reports the current app', () => {
    expect(useSite().currentApp).toBe('web')
  })

  it('maps each site key to its url', () => {
    const { linkTo } = useSite()

    expect(linkTo('web')).toBe('http://web.test')
    expect(linkTo('app')).toBe('http://app.test')
    expect(linkTo('admin')).toBe('http://admin.test')
  })
})
