import { v1 } from '@mysite/types'

export default defineVersionedHandler('v1', () => {
  return v1.helloResponseSchema.parse(getHelloMessage())
})
