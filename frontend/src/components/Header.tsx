import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LogOut, Rocket } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function Header() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    const handleLogout = () => {
        signOut();
        toast.success(t('auth.logout'));
        navigate('/auth');
    };

    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-primary/10 rounded-xl">
                        <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-tight leading-none bg-gradient-to-r from-primary via-blue-500 to-accent bg-clip-text text-transparent hidden sm:block">
                            {t('auth.title')}
                        </h1>
                        <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] hidden sm:block">
                            {t('common.version')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-sm font-medium text-muted-foreground hidden md:block">
                            {user?.username}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <LanguageToggle />
                        <ThemeToggle />
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={handleLogout}
                            title={t('auth.logout')}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
