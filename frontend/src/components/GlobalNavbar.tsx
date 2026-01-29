import { useRobotStore } from '@/stores/robotStore';
import { SpeedControl } from './SpeedControl';
import ConnectionStatus from './ConnectionStatus';
import { useTranslation } from "react-i18next";
import { api } from '@/services/api';
import { toast } from 'sonner';

export const GlobalNavbar = () => {
    const {
        isConnected,
        setConnectionStatus,
        host,
        port,
    } = useRobotStore();
    const { t } = useTranslation();

    const handleToggleConnection = async () => {
        const newStatus = !isConnected;

        if (newStatus) {
            try {
                const result = await api.connectRobot(host || "192.168.15.130", port || 30002);
                if (result.success) {
                    // Fetch full status to get capability flags (like speed control support)
                    const status = await api.getRobotStatus();
                    setConnectionStatus(status.connected, status.host, status.port, status.speed_control_supported);
                    toast.success(t('auth.loginSuccess'));
                }
            } catch (error: any) {
                toast.error(error.message || t('errors.connectionFailed'));
            }
        } else {
            try {
                await api.disconnectRobot();
                setConnectionStatus(false);
                toast.info(t('robot.disconnected'));
            } catch (error: any) {
                toast.error(error.message || t('errors.commandFailed'));
            }
        }
    };

    return (
        <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-50 sticky top-0 shadow-sm">
            {/* Left: Branding/Title */}
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-primary/20 shadow-inner bg-white/10">
                    <img src="/logo.png" alt="UR" className="w-full h-full object-contain p-1.5" />
                </div>
                <div>
                    <h1 className="text-lg font-black tracking-tight leading-none text-foreground/90 uppercase">
                        {t('auth.title').split(' ').slice(0, 2).join(' ')} Controller
                    </h1>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 opacity-70">
                        Universal Robots Interface
                    </p>
                </div>
            </div>

            {/* Middle: Tooling */}
            <div className="flex items-center gap-6">
                <SpeedControl />
            </div>

            {/* Right: Connection Status */}
            <div className="flex items-center gap-4">
                <ConnectionStatus
                    isConnected={isConnected}
                    onToggleConnection={handleToggleConnection}
                    variant="compact"
                />
            </div>
        </header>
    );
};

export default GlobalNavbar;
