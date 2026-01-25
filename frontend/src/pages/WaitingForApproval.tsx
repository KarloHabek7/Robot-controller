import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

const WaitingForApproval = () => {
    const { t } = useTranslation();
    const { user, signOut, checkAuth } = useAuth();
    const navigate = useNavigate();

    // Redirect if user becomes approved
    useEffect(() => {
        if (user?.is_approved || user?.is_superuser) {
            navigate("/");
        }
    }, [user, navigate]);

    // Manual refresh check
    useEffect(() => {
        const interval = setInterval(() => {
            checkAuth(true);
        }, 5000); // Check every 5 seconds on this page specifically
        return () => clearInterval(interval);
    }, [checkAuth]);

    const handleSignOut = () => {
        signOut();
        navigate("/auth");
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="p-8 space-y-4 text-center border rounded-lg shadow-lg bg-card border-border">
                <h1 className="text-2xl font-bold text-foreground">{t('auth.pendingApprovalTitle')}</h1>
                <p className="text-muted-foreground">
                    {t('auth.pendingApprovalDesc')}
                </p>
                <div className="flex flex-col gap-2">
                    <Button onClick={() => checkAuth()} variant="default" className="mt-4">
                        {t('common.refresh')}
                    </Button>
                    <Button onClick={handleSignOut} variant="outline">
                        {t('auth.logout')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default WaitingForApproval;
