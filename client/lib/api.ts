import axios from 'axios';

const baseURL = 'https://compresuafoto-comigo.onrender.com/api';
// Fallback local para desenvolvimento se necessário:
// const baseURL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'https://compresuafoto-comigo.onrender.com/api';

console.log('API BASE URL:', baseURL);

const api = axios.create({
    baseURL,
    timeout: 120000, // 2 minutes timeout
});

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor to handle session expiration (Logout Automático)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined') {
            const status = error.response?.status;
            const message = error.response?.data?.error;
            const requestUrl = error.config?.url || '';

            // Don't intercept auth endpoints — 401 there means bad credentials, not expired session
            const isAuthEndpoint = requestUrl.includes('/auth/');

            if (!isAuthEndpoint && (status === 401 || (status === 403 && message === 'Invalid token'))) {
                console.warn("Sessão expirada ou inválida. Redirecionando para login...");
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // Only redirect if not already on the login page to avoid loops
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?expired=true';
                }
            }
        }
        return Promise.reject(error);
    }
);

export const getEvents = async (status?: string) => {
    const response = await api.get('events', { params: { status } });
    return response.data;
};

export const updateEvent = async (id: number, data: any) => {
    // If data contains a file, we need to use FormData
    if (data instanceof FormData) {
        const response = await api.put(`events/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }

    // Otherwise JSON
    const response = await api.put(`events/${id}`, data);
    return response.data;
};

export const getEvent = async (id: string) => {
    const response = await api.get(`events/${id}`);
    return response.data;
};

export const uploadPhotos = async (eventId: number, formData: FormData, onProgress?: (progress: number) => void) => {
    const response = await api.post('photos/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });
    return response.data;
};

export const searchFaces = async (eventId: number, selfieFile: File) => {
    const formData = new FormData();
    formData.append('eventId', eventId.toString());
    formData.append('selfie', selfieFile);

    const response = await api.post('photos/search', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    });
    return response.data;
};

export const deleteEvent = async (id: number) => {
    const response = await api.delete(`events/${id}`);
    return response.data;
};

export const uploadWithRetry = async (
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
    maxRetries = 3
): Promise<any> => {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        onProgress(percent);
                    }
                }
            });
            return response.data;
        } catch (error: any) {
            lastError = error;
            console.warn(`Upload attempt ${i + 1} failed:`, error.message);

            // Don't retry on certain errors (like 400 Bad Request or 401 Unauthorized)
            if (error.response && (error.response.status === 400 || error.response.status === 401)) {
                throw error;
            }

            // Exponential backoff
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
};

export const sendProposalEmail = async (data: { email: string; clientName: string; selectedServices: any[]; total: number }) => {
    const response = await api.post('proposals/send-email', data);
    return response.data;
};

export const downloadProposalPdf = async (data: { clientName: string; selectedServices: any[]; total: number }) => {
    const response = await api.post('proposals/download', data, {
        responseType: 'blob'
    });
    return response.data;
};

export const createProposal = async (data: { clientName: string; clientEmail?: string; selectedServices: any[]; total: number }) => {
    const response = await api.post('proposals', data);
    return response.data;
};

export const getProposals = async () => {
    const response = await api.get('proposals');
    return response.data;
};

export const deleteProposal = async (id: number) => {
    const response = await api.delete(`proposals/${id}`);
    return response.data;
};

export const approveProposal = async (id: number) => {
    const response = await api.patch(`proposals/${id}/approve`);
    return response.data;
};

export default api;
