import {useState} from "react";
import {AppDispatch} from "../../utils/store.ts";
import {useDispatch} from "react-redux";
import {setAppError, setAppLoading} from "../../slices/appSlice.ts";
import Cookies from "js-cookie";
import {setAccountAuthorized} from "../../slices/accountSlice.ts";
import {apiOauth, apiScire, apiStorage} from "../../utils/api.ts";

const loginUser = async (username: string, password: string) => {
    return apiOauth.post('/users/login', new URLSearchParams({username, password}), {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    });
};

const Authorization = () => {
    const dispatch: AppDispatch = useDispatch();

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!username || !password) {
            dispatch(setAppError('field "username" and "password" is required'))
            return;
        }

        dispatch(setAppLoading(true));
        try {
            const response = await loginUser(username, password);
            const token = response.data.access_token;
            Cookies.set('token', token, {expires: 1});
            apiOauth.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            apiStorage.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            apiScire.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            dispatch(setAccountAuthorized(true));
        } catch (error: unknown) {
            console.error(error);
            if (error instanceof Error) {
                dispatch(setAppError(error.message));
            } else {
                dispatch(setAppError("An unknown error occurred"));
            }
            Cookies.remove('token');
            delete apiOauth.defaults.headers.common['Authorization'];
            delete apiStorage.defaults.headers.common['Authorization'];
            delete apiScire.defaults.headers.common['Authorization'];
            dispatch(setAccountAuthorized(false));
        } finally {
            dispatch(setAppLoading(false));
        }
    };

    return (
        <div className="fixed z-50 inset-0 flex items-center justify-center h-screen bg-white">
            <div className="p-6 w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center mb-6">Authorization</h2>
                <form onSubmit={handleSubmit} className="space-y-2">
                    <div>
                        <input
                            type="text"
                            id="username"
                            className="block w-full px-3 h-12 text-gray-700 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            id="password"
                            className="block w-full px-3 h-12 text-gray-700 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-white hover:bg-gray-300 border border-gray-300 text-gray-700 h-12 px-4 transition duration-300"
                    >
                        Submit
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Authorization;
