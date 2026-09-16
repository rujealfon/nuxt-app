import { v1 } from '@nuxt-app/types'

export default defineVersionedHandler('v1', () => {
  return v1.helloResponseSchema.parse(getHelloMessage())
})
