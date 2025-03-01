export const dateToString = (inputDate: Date) => {
    const adjustedDate = new Date(inputDate);
    adjustedDate.setHours(adjustedDate.getHours() + 4);

    const time = adjustedDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const date = adjustedDate.toLocaleDateString('ru-RU', {
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
