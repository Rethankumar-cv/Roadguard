import { useState, useEffect } from 'react';

export function useCountUp(target, duration = 1200) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        const steps = 50;
        const stepDur = duration / steps;
        let current = 0;
        const inc = target / steps;
        const timer = setInterval(() => {
            current += inc;
            if (current >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, stepDur);
        return () => clearInterval(timer);
    }, [target, duration]);

    return count;
}
