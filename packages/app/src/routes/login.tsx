import { createSignal, Show } from "solid-js"
import { useNavigate } from "solid-start"
import { authClient } from "~/lib/auth/authClient"

export default function loginPage() {
	const navigate = useNavigate()
	const [errorMessage, setErrorMessage] = createSignal<string | undefined>()

	async function attemptLogin(username: string, password: string) {
		const { success } = (await authClient.login("credentials", {
			input: { username, password },
		})) as { success: boolean }

		if (success) navigate("/")
	}

	return (
		<div>
			<form
				class="flex flex-col items-center"
				onSubmit={(event) => {
					event.preventDefault()
					const userField = event.currentTarget[0] as HTMLInputElement
					const passwordField = event.currentTarget[1] as HTMLInputElement

					attemptLogin(userField.value, passwordField.value).catch(({ message }) => setErrorMessage(message))
				}}
			>
				<div class="w-[600px] max-w-full px-4 py-8">
					<div class="mb-6">
						<input
							name="username"
							type="text"
							class="form-control block w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
							placeholder="Username"
						/>
					</div>

					<div class="mb-6">
						<input
							name="password"
							type="password"
							class="form-control block w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
							placeholder="Password"
						/>
					</div>

					<button
						type="submit"
						class="inline-block px-7 py-3 bg-blue-600 text-white font-medium text-sm leading-snug uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out w-full"
					>
						Login
					</button>

					<Show when={errorMessage()}>
						<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 my-8 rounded relative" role="alert">
							<strong class="font-bold">Error!</strong> <span class="block sm:inline">{errorMessage()}</span>
						</div>
					</Show>
				</div>
			</form>
		</div>
	)
}
