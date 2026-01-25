import React from 'react';
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from "./theme-provider";
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sun, Moon, Languages, LogOut, LayoutDashboard, User as UserIcon, Menu } from 'lucide-react';

export const Navbar = () => {
    const { t, i18n } = useTranslation();
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'hr' : 'en';
        i18n.changeLanguage(newLang);
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full px-4 md:px-6">
            <div className="flex h-full items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-black text-xs">UR5</span>
                        </div>
                        <span className="font-black uppercase tracking-tighter text-sm md:text-base hidden sm:inline-block">
                            Robot Control
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    {/* Admin Dashboard - only for superusers */}
                    {user?.is_superuser && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="hidden md:flex gap-2 text-xs font-bold uppercase tracking-wider"
                            onClick={() => navigate('/admin')}
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            {t('admin.dashboard')}
                        </Button>
                    )}

                    {/* Language Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleLanguage}
                        className="h-9 w-9"
                    >
                        <Languages className="h-4 w-4" />
                        <span className="sr-only">Toggle Language</span>
                    </Button>

                    {/* Theme Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="h-9 w-9"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle Theme</span>
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 rounded-full px-2 gap-2 hover:bg-secondary/50 transition-colors">
                                <Avatar className="h-7 w-7 border">
                                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold">
                                        {user?.username?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-bold hidden md:inline-block">
                                    {user?.username}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal text-[10px] uppercase tracking-widest text-muted-foreground py-2">
                                {t('auth.username')}
                            </DropdownMenuLabel>
                            <div className="px-2 py-1.5 flex flex-col gap-0.5">
                                <span className="text-sm font-bold leading-none">{user?.username}</span>
                                <span className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </span>
                            </div>
                            <DropdownMenuSeparator />

                            {/* Mobile only items */}
                            <div className="md:hidden">
                                {user?.is_superuser && (
                                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                                        <LayoutDashboard className="mr-2 h-4 w-4" />
                                        <span>{t('admin.dashboard')}</span>
                                    </DropdownMenuItem>
                                )}
                            </div>

                            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>{t('auth.logout')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
