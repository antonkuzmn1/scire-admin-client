import React from "react";

const LoadingSpinner: React.FC = () => {
    return (
        <div className={'fixed inset-0 w-full h-full flex items-center justify-center'}>
            <div className={'w-12 h-12 border-4 border-t-transparent rounded-full animate-spin'}></div>
        </div>
    );
}

export default LoadingSpinner;
