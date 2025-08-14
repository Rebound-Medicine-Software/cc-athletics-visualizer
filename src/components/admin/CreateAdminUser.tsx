import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const CreateAdminUser = () => {
  const [email, setEmail] = useState("reflexsportstherapyy@gmail.com");
  const [isCreating, setIsCreating] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const createAdminUser = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email,
          role: 'super_admin',
          fullName: 'Super Admin'
        }
      });

      if (error) throw error;

      toast.success("Admin user created successfully!");
      console.log("Reset link:", data.resetLink);
      
    } catch (error: any) {
      console.error("Error creating admin user:", error);
      toast.error("Failed to create admin user: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const sendPasswordReset = async () => {
    setIsSendingReset(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email }
      });

      if (error) throw error;

      toast.success("Password reset email sent!");
      
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      toast.error("Failed to send reset email: " + error.message);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Admin User Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={createAdminUser}
            disabled={isCreating || !email}
            className="w-full"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {isCreating ? "Creating..." : "Create Super Admin"}
          </Button>
          
          <Button 
            onClick={sendPasswordReset}
            disabled={isSendingReset || !email}
            variant="outline"
            className="w-full"
          >
            <Mail className="w-4 h-4 mr-2" />
            {isSendingReset ? "Sending..." : "Send Password Reset"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};