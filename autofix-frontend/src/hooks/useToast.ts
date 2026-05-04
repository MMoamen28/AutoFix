import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext'; // I need to export the context itself too

// Wait, I'll just update the context file to export the context object so I can use it here.
// Or I can just keep useToast in the context file. 
// Actually, the user asked for useToast.ts hook.

// I'll update ToastContext.tsx to export the context object.
export { useToast } from '../context/ToastContext';
