import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const WaitingForApproval = () => {
    const { signOut } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="p-8 space-y-4 text-center border rounded-lg shadow-lg bg-card border-border">
                <h1 className="text-2xl font-bold text-foreground">Account Pending Approval</h1>
                <p className="text-muted-foreground">
                    Your account is currently waiting for administrator approval.<br />
                    Please check back later or contact the system administrator.
                </p>
                <Button onClick={signOut} variant="outline" className="mt-4">
                    Sign Out
                </Button>
            </div>
        </div>
    );
};

export default WaitingForApproval;
