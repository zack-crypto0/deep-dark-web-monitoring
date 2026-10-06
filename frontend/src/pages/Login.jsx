import { useState } from "react"

import {
  apiFetch
} from "../api"


function Login({
  onLoginSuccess
}) {

  const [username, setUsername] =
    useState("")

  const [password, setPassword] =
    useState("")

  const [error, setError] =
    useState("")

  const [loading, setLoading] =
    useState(false)


  const handleLogin = async (
    event
  ) => {

    event.preventDefault()

    setError("")
    setLoading(true)


    try {

      const response =
        await apiFetch(
          "/auth/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              username,
              password
            })
          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        setError(
          data.detail ||
          "Invalid username or password."
        )

        return

      }


      onLoginSuccess(
        data.token,
        data.user
      )


    } catch (error) {

      console.error(
        "Login error:",
        error
      )

      setError(
        "Unable to sign in. Please check your credentials or try again."
      )

    } finally {

      setLoading(false)

    }

  }


  return (

    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">


      <div className="w-full max-w-md">


        {/* LOGO / TITLE */}

        <div className="text-center mb-8">

          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-5">

            <span className="text-2xl font-bold">
              DDW
            </span>

          </div>


          <h1 className="text-3xl font-bold">
            DDW Monitor
          </h1>


          <p className="text-slate-400 mt-2">
            Deep Dark Web Monitoring System
          </p>

        </div>


        {/* LOGIN CARD */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">


          <div className="mb-6">

            <h2 className="text-2xl font-bold">
              Sign In
            </h2>

            <p className="text-sm text-slate-400 mt-1">
              Enter your account credentials to continue.
            </p>

          </div>


          {/* ERROR MESSAGE */}

          {error && (

            <div className="mb-5 bg-red-950/60 border border-red-800 text-red-300 p-4 rounded-lg text-sm">

              {error}

            </div>

          )}


          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >


            {/* USERNAME */}

            <div>

              <label className="block mb-2 text-sm font-medium text-slate-300">

                Username

              </label>


              <input
                type="text"

                value={username}

                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }

                placeholder="Enter username"

                required

                autoComplete="username"

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition"
              />

            </div>


            {/* PASSWORD */}

            <div>

              <label className="block mb-2 text-sm font-medium text-slate-300">

                Password

              </label>


              <input
                type="password"

                value={password}

                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }

                placeholder="Enter password"

                required

                autoComplete="current-password"

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition"
              />

            </div>


            {/* LOGIN BUTTON */}

            <button
              type="submit"

              disabled={loading}

              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed py-3 rounded-lg font-semibold transition"
            >

              {
                loading
                  ? "Signing In..."
                  : "Sign In"
              }

            </button>

          </form>


          <div className="mt-7 pt-6 border-t border-slate-800 text-center">

            <p className="text-xs text-slate-500">
              Authorized personnel only
            </p>

            <p className="text-xs text-slate-600 mt-1">
              Threat Intelligence Monitoring Platform
            </p>

          </div>

        </div>

      </div>

    </div>

  )
}


export default Login