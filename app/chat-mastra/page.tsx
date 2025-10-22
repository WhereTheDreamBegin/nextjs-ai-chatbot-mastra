import { redirect } from "next/navigation";
import { SimpleMastraChat } from "@/components/simple-mastra-chat";
import { auth } from "../(auth)/auth";

// export default async function Page() {
//   const session = await auth();

//   if (!session) {
//     redirect("/api/auth/guest");
//   }

//   // Sử dụng Mastra Chat thay vì chat gốc
//   return <SimpleMastraChat />;
// }

export default async function Page() {

  return <SimpleMastraChat />;
}
