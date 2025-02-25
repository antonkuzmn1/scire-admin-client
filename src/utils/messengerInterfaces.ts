export interface Company {
    id: number;
    username: string;
    description: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface Admin {
    id: number;
    username: string;
    password: string;
    surname: string;
    name: string;
    middlename: string | null;
    department: string | null;
    phone: string | null;
    cellular: string | null;
    post: string | null;
    companies: Company[]
    companyNames: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface User {
    id: number;
    username: string;
    password: string;
    surname: string;
    name: string;
    middlename: string | null;
    department: string | null;
    local_workplace: string | null;
    remote_workplace: string | null;
    phone: string | null;
    cellular: string | null;
    post: string | null;
    company: Company
    companyName: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface Ticket {
    id: number;
    title: string;
    description: string;
    status: 0 | 1 | 2
    statusText: 'Pending' | 'In progress' | 'Solved';
    user_id: number;
    userName: string;
    admin_id: number | null;
    adminName: string;
    created_at: string | null;
    updated_at: string | null;
}

interface MessageFile {
    item_id: number;
    file_uuid: string;
    file_name: string;
    file_size: number;
}

interface TicketFile {
    item_id: number;
    file_uuid: string;
    file_name: string;
    file_size: number;
}

interface Message {
    id: number;
    text: string;
    user_id: number;
    userName: string;
    admin_id: number | null;
    ticket_id: Ticket['id'];
    admin_connected: boolean;
    admin_disconnected: boolean;
    in_progress: boolean;
    solved: boolean;
    files: MessageFile[];
}
