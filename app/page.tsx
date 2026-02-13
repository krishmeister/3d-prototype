import { Scene } from '@/components/Canvas/Scene';
import { Overlay } from '@/components/UI/Overlay';
import { PhoneUI } from '@/components/UI/PhoneUI';

export default function Home() {
    return (
        <main className="h-screen w-full relative overflow-hidden bg-black">
            <div className="h-screen w-full absolute inset-0">
                <Scene />
            </div>
            <Overlay />
            <PhoneUI />
        </main>
    );
}
