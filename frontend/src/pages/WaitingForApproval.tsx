import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";

const WaitingForApproval = () => {
    const { t } = useTranslation();
    const { user, checkAuth } = useAuth();
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


    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="p-8 space-y-4 text-center border rounded-lg shadow-lg bg-card border-border max-w-md">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">{t('auth.pendingApprovalTitle')}</h1>
                    <p className="text-muted-foreground text-sm">
                        {t('auth.pendingApprovalDesc')}
                    </p>
                    <div className="flex flex-col gap-2 pt-2">
                        <Button onClick={() => checkAuth()} variant="default" className="w-full font-bold uppercase tracking-wider h-11">
                            {t('common.refresh')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaitingForApproval;
