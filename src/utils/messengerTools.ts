import {Admin, User} from "./messengerInterfaces.ts";

export const statusToText = (status: 0 | 1 | 2) => {
    return status === 2
        ? 'Solved'
        : status === 1
            ? 'In progress'
            : 'Pending';
}

export const adminIdToName = (adminId: number | null, admins: Admin[])=> {
    const admin = admins.find((admin: Admin) => admin.id === adminId);
    if (!admin) {
        return '';
    }
    return `${admin.surname} ${admin.name} ${admin.middlename}`.trim()
}

export const userIdToName = (userId: number | null, users: User[]) => {
    const user = users.find((user: User) => user.id === userId);
    if (!user) {
        return '';
    }
    return `${user.surname} ${user.name} ${user.middlename}`.trim()
}
