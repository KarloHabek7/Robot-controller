import { useRobotStore } from '@/stores/robotStore';
import { SpeedControl } from './SpeedControl';
import ConnectionStatus from './ConnectionStatus';
import { api } from '@/services/api';
import { toast } from 'sonner';

export const GlobalNavbar = () => {
    const {
        isConnected,
        setConnectionStatus,
        host,
        port,
    } = useRobotStore();

    const handleToggleConnection = async () => {
        const newStatus = !isConnected;

        if (newStatus) {
            try {
                const result = await api.connectRobot(host || "192.168.15.130", port || 30002);
                if (result.success) {
                    setConnectionStatus(true, host, port);
                    toast.success("Connected to robot!");
                }
            } catch (error) {
                toast.error("Connection failed");
            }
        } else {
            try {
                await api.disconnectRobot();
                setConnectionStatus(false);
                toast.info("Disconnected from robot");
            } catch (error) {
                toast.error("Disconnection failed");
            }
        }
    };

    return (
        <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 z-50 sticky top-0 shadow-sm">
            {/* Left: Branding/Title */}
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
                    UR
                </div>
                <div>
                    <h1 className="text-lg font-black tracking-tight leading-none text-foreground/90 uppercase">
                        UR5 Controller
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
