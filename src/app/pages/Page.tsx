import React from "react";
import Navbar from "../components/Navbar.tsx";

export interface ContentProps {
    element: any;
}

const Page: React.FC<ContentProps> = (props: ContentProps) => {

    return (
        <>
            <div>{props.element}</div>
            <Navbar/>
        </>
    )
}

export default Page
