const API_URL = "http://127.0.0.1:8000"


export async function apiFetch(
  endpoint,
  options = {}
) {

  const token =
    localStorage.getItem("auth_token")


  const headers = {
    ...(options.headers || {})
  }


  if (token) {

    headers.Authorization =
      `Bearer ${token}`

  }


  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  )


  if (response.status === 401) {

    localStorage.removeItem(
      "auth_token"
    )

    localStorage.removeItem(
      "user"
    )

    window.location.href = "/"

    throw new Error(
      "Authentication required"
    )

  }


  return response
}