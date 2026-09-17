type ApiClient = typeof $fetch

let client: ApiClient | undefined
let clientBaseURL = ''

// Versioned product API client. Better Auth keeps its own unversioned client
// (`useAuthClient`); this is for the `/api/<version>/*` domain routes.
export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.apiBase}/api/${config.public.apiVersion}`

  if (!client || clientBaseURL !== baseURL) {
    client = $fetch.create({
      baseURL,
      credentials: 'include',
    })
    clientBaseURL = baseURL
  }

  return {
    api: client,
    apiUrl: (path: string) => `${baseURL}${path}`,
  }
}
