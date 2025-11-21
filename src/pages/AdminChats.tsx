import { ChatInterface } from "@/components/chat/ChatInterface";

const AdminChats = () => {
  return (
    <div className="h-screen">
      <ChatInterface userRole="admin" />
    </div>
  );
};

export default AdminChats;
