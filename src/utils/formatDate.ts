export const dateToString = (inputDate: Date) => {
    const time = inputDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const date = inputDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return `${time} - ${date}`;
}

export const dateToStringOnlyDate = (inputDate: Date) => {
    return inputDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
