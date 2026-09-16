import { v1 } from '@nuxt-app/types'
import { getHelloMessage } from '../../services/hello'

export default defineVersionedHandler('v1', () => {
  return v1.helloResponseSchema.parse(getHelloMessage())
})
