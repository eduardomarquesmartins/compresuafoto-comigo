import axios from 'axios';

const isLocalhost = typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' || 
       window.location.hostname.startsWith('10.0.0.') || 
       window.location.hostname.startsWith('192.168.'))
    : process.env.NODE_ENV === 'development';

const envBaseURL = process.env.NEXT_PUBLIC_API_URL;

const normalizeApiBaseURL = (url?: string) => {
    if (!url) return undefined;
    const trimmed = url.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const localBaseURL = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3002/api`;
const baseURL = isLocalhost
    ? localBaseURL
    : normalizeApiBaseURL(envBaseURL) || 'https://compresuafoto-comigo.onrender.com/api';

const api = axios.create({
    baseURL,
    // Keep regular admin reads responsive. Long-running uploads set their own timeout below.
    timeout: 30000,
});

const isMissingOnlineAdminEndpoint = (error: unknown) => {
    return axios.isAxiosError(error) && error.response?.status === 404;
};

const adminEndpointFallback = <T>(endpoint: string, fallback: T, error: unknown): T => {
    if (isMissingOnlineAdminEndpoint(error) || (axios.isAxiosError(error) && !error.response)) {
        console.warn(
            `[Admin API] Endpoint /${endpoint} não está disponível na API configurada (${baseURL}). ` +
            `Renderizando fallback local até o backend online ser atualizado.`
        );
        return fallback;
    }
    throw error;
};

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
                    const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
                    window.location.href = `${loginPath}?expired=true`;
                }
            }
        }
        return Promise.reject(error);
    }
);

export const getEvents = async (status?: string) => {
    try {
        const response = await api.get('events', { params: { status } });
        return response.data;
    } catch (error) {
        return adminEndpointFallback('events', [], error);
    }
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
    try {
        const response = await api.get(`events/${id}`);
        return response.data;
    } catch (error) {
        return adminEndpointFallback(`events/${id}`, null, error);
    }
};

export const uploadPhotos = async (eventId: number, formData: FormData, onProgress?: (progress: number) => void) => {
    const response = await api.post('photos/upload', formData, {
        timeout: 600000,
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
                timeout: 600000,
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

export const createProposal = async (data: { clientId?: number; clientName: string; clientEmail?: string; selectedServices: any[]; total: number }) => {
    const response = await api.post('proposals', data);
    return response.data;
};

export const updateProposal = async (id: number | string, data: { clientId?: number; clientName: string; clientEmail?: string; selectedServices: any[]; total: number }) => {
    const response = await api.put(`proposals/${id}`, data);
    return response.data;
};

export const getProposals = async () => {
    try {
        const response = await api.get('proposals');
        return response.data;
    } catch (error) {
        return adminEndpointFallback('proposals', [], error);
    }
};

export const getProposal = async (id: number | string) => {
    try {
        const response = await api.get(`proposals/${id}`);
        return response.data;
    } catch (error) {
        return adminEndpointFallback(`proposals/${id}`, null, error);
    }
};

export const deleteProposal = async (id: number) => {
    const response = await api.delete(`proposals/${id}`);
    return response.data;
};

export const approveProposal = async (id: number) => {
    const response = await api.patch(`proposals/${id}/approve`);
    return response.data;
};

export const linkProposalClient = async (id: number, clientId?: number) => {
    const response = await api.patch(`proposals/${id}/link-client`, { clientId });
    return response.data;
};

export const downloadContractPdf = async (data: {
    clientName: string;
    clientDocument: string;
    clientAddress?: string;
    clientCityState?: string;
    signerName?: string;
    signerDocument?: string;
    scope?: string;
    monthlyValue?: number;
    durationMonths?: string;
    paymentDay?: string;
    contractDate?: string;
}) => {
    const response = await api.post('contracts/generate', data, {
        responseType: 'blob'
    });
    return response.data;
};

export const sendContractSignatureLink = async (data: {
    clientId?: number;
    clientName?: string;
    clientEmail?: string;
    clientDocument?: string;
    clientAddress?: string;
    clientCityState?: string;
    signerName?: string;
    signerDocument?: string;
    scope: string;
    monthlyValue: number;
    durationMonths: string;
    paymentDay: string;
    startDate?: string;
    contractDate?: string;
    delivery?: 'email' | 'copy';
}) => {
    const response = await api.post('contracts/send-sign-link', data);
    return response.data;
};

export const getPublicContract = async (token: string) => {
    const response = await api.get(`public-contracts/${token}`);
    return response.data;
};

export const downloadPublicContractPdf = async (token: string) => {
    const response = await api.get(`public-contracts/${token}/pdf`, {
        responseType: 'blob'
    });
    return response.data;
};

export const signPublicContract = async (token: string, data: {
    signedSignatureData: string;
    signerName?: string;
    signerDocument?: string;
}) => {
    const response = await api.post(`public-contracts/${token}/sign`, data);
    return response.data;
};

// --- Clientes (Client API) ---
export const getClients = async () => {
    try {
        const response = await api.get('clients');
        return response.data;
    } catch (error) {
        return adminEndpointFallback('clients', [], error);
    }
};

export const createClient = async (data: any) => {
    const response = await api.post('clients', data);
    return response.data;
};

export const updateClient = async (id: number, data: any) => {
    const response = await api.put(`clients/${id}`, data);
    return response.data;
};

export const deleteClient = async (id: number) => {
    const response = await api.delete(`clients/${id}`);
    return response.data;
};

export const sendClientEmail = async (data: {
    mode: 'selected' | 'active' | 'all';
    clientIds: number[];
    subject: string;
    preheader?: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
    replyTo?: string;
    attachments?: File[];
}) => {
    if (data.attachments?.length) {
        const formData = new FormData();
        formData.append('mode', data.mode);
        formData.append('clientIds', JSON.stringify(data.clientIds));
        formData.append('subject', data.subject);
        formData.append('preheader', data.preheader || '');
        formData.append('body', data.body);
        formData.append('ctaLabel', data.ctaLabel || '');
        formData.append('ctaUrl', data.ctaUrl || '');
        formData.append('replyTo', data.replyTo || '');
        data.attachments.forEach(file => formData.append('attachments', file));

        const response = await api.post('client-emails/send', formData, {
            timeout: 120000
        });
        return response.data;
    }

    const response = await api.post('client-emails/send', data);
    return response.data;
};

// --- Contratos de Banco (Contract Database API) ---
export const getContracts = async () => {
    try {
        const response = await api.get('contracts');
        return response.data;
    } catch (error) {
        return adminEndpointFallback('contracts', [], error);
    }
};

export const createContract = async (data: any) => {
    const response = await api.post('contracts', data);
    return response.data;
};

export const deleteContract = async (id: number) => {
    const response = await api.delete(`contracts/${id}`);
    return response.data;
};

// --- Financeiro (Financial Record API) ---
export const getFinancials = async (params: { month?: string; year?: string; type?: string }) => {
    try {
        const response = await api.get('financials', { params });
        return response.data;
    } catch (error) {
        return adminEndpointFallback('financials', [], error);
    }
};

export const getFinancialStats = async (params: { month: string; year: string }) => {
    try {
        const response = await api.get('financials/stats', { params });
        return response.data;
    } catch (error) {
        return adminEndpointFallback('financials/stats', { incomes: 0, expenses: 0, balance: 0, forecast: 0 }, error);
    }
};

export const createFinancial = async (data: any) => {
    const response = await api.post('financials', data);
    return response.data;
};

export const uploadFinancialNote = async (data: {
    note: File;
    status?: string;
    account?: string;
    obs?: string;
}) => {
    const formData = new FormData();
    formData.append('note', data.note);
    formData.append('status', data.status || '');
    formData.append('account', data.account || '');
    formData.append('obs', data.obs || '');

    const response = await api.post('financials/note-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
    });
    return response.data;
};

export const updateFinancial = async (id: number, data: any) => {
    const response = await api.put(`financials/${id}`, data);
    return response.data;
};

export const deleteFinancial = async (id: number) => {
    const response = await api.delete(`financials/${id}`);
    return response.data;
};

// --- Importador Excel (Excel Import API) ---
export const importExcel = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('excel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// --- Dívidas (Debt API) ---
export const getDebts = async () => {
    try {
        const response = await api.get('debts');
        return response.data;
    } catch (error) {
        return adminEndpointFallback('debts', [], error);
    }
};

export const createDebt = async (data: any) => {
    const response = await api.post('debts', data);
    return response.data;
};

export const updateDebt = async (id: number, data: any) => {
    const response = await api.put(`debts/${id}`, data);
    return response.data;
};

export const deleteDebt = async (id: number) => {
    const response = await api.delete(`debts/${id}`);
    return response.data;
};

// --- Demandas da Mentoria (MentoriaDemand API) ---
export const getDemands = async () => {
    try {
        const response = await api.get('demands');
        return response.data;
    } catch (error) {
        return adminEndpointFallback('demands', [], error);
    }
};

export const createDemand = async (data: any) => {
    const response = await api.post('demands', data);
    return response.data;
};

export const updateDemand = async (id: number, data: any) => {
    const response = await api.put(`demands/${id}`, data);
    return response.data;
};

export const deleteDemand = async (id: number) => {
    const response = await api.delete(`demands/${id}`);
    return response.data;
};

export default api;
