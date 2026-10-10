"use client";
export default function LogoutButton(){return <form action="/api/auth/logout" method="post"><button className="btn light" type="submit">Sign out</button></form>}
