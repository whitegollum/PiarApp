import api from './api';

export interface EmailConfig {
    smtp_server: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password?: string;
    smtp_from_email: string;
    smtp_use_tls: boolean;
    smtp_use_ssl: boolean;
    frontend_url: string;
}

export const adminService = {
    getEmailConfig: async (): Promise<EmailConfig> => {
        return api.get('/admin/config/email');
    },

    updateEmailConfig: async (config: EmailConfig): Promise<EmailConfig> => {
        return api.put('/admin/config/email', config);
    },

    sendTestEmail: async (toEmail: string): Promise<void> => {
        await api.post('/admin/config/test-email', { to_email: toEmail });
    }
};
