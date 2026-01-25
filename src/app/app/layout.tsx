
import { redirect } from "next/navigation";
import Navbar from "./components/Navbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {


 

  return <>
  <Navbar title="Dashboard" />
  {children}
  </>;
}
