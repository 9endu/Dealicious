"use client";
import React, { useEffect, useState } from "react";

export default function CursorBackground() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            // Calculate position normalized from -1 to 1
            const x = (event.clientX / window.innerWidth) * 2 - 1;
            const y = (event.clientY / window.innerHeight) * 2 - 1;
            setMousePosition({ x, y });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const { x, y } = mousePosition;

    return (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            {/* Blob 1 - Moves opposite to mouse (stronger effect) */}
            <div
                className="absolute top-[20%] right-[10%] transition-transform duration-[3000ms] ease-out will-change-transform"
                style={{ transform: `translate(${x * -120}px, ${y * -120}px)` }}
            >
                <div className="w-[50vh] h-[50vh] bg-indigo-500/30 rounded-full blur-[100px] animate-float" />
            </div>

            {/* Blob 2 - Moves with mouse (lighter effect) */}
            <div
                className="absolute -bottom-[10%] -left-[10%] transition-transform duration-[4000ms] ease-out will-change-transform"
                style={{ transform: `translate(${x * 100}px, ${y * 100}px)` }}
            >
                <div className="w-[60vh] h-[60vh] bg-purple-500/30 rounded-full blur-[100px] animate-float-delayed" />
            </div>

            {/* Blob 3 - Center ambient (subtle movement) */}
            <div
                className="absolute top-[40%] left-[30%] transition-transform duration-[5000ms] ease-out will-change-transform"
                style={{ transform: `translate(${x * -60}px, ${y * -60}px)` }}
            >
                <div className="w-[30vh] h-[30vh] bg-pink-500/20 rounded-full blur-[80px] animate-float-slow" />
            </div>

            {/* Blob 4 - Extra Cyan (Fast and opposite) */}
            <div
                className="absolute top-[10%] left-[20%] transition-transform duration-[2500ms] ease-out will-change-transform"
                style={{ transform: `translate(${x * 80}px, ${y * 80}px)` }}
            >
                <div className="w-[20vh] h-[20vh] bg-cyan-500/20 rounded-full blur-[60px] animate-float-fast" />
            </div>

            {/* Blob 5 - Bottom Right Emerald (Slow and heavy) */}
            <div
                className="absolute bottom-[20%] right-[20%] transition-transform duration-[6000ms] ease-out will-change-transform"
                style={{ transform: `translate(${x * -40}px, ${y * -40}px)` }}
            >
                <div className="w-[40vh] h-[40vh] bg-emerald-500/10 rounded-full blur-[90px] animate-float-slow" />
            </div>
        </div>
    );
}
