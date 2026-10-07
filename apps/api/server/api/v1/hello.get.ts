import { v1 } from '@nuxt-app/types'
import { getHelloMessage } from '#server/services/hello'
import { defineVersionedHandler } from '#server/utils/versioned'

export default defineVersionedHandler('v1', () => {
  return v1.helloResponseSchema.parse(getHelloMessage())
})
