import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
export default function SignupPage(){return <main className="min-h-screen"><header className="shell flex h-20 items-center justify-between"><Link href="/" className="font-black">Speakly</Link><ThemeToggle/></header><section className="shell flex justify-center py-10"><AuthForm mode="signup"/></section></main>}
