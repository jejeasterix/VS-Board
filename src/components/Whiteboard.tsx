import { Excalidraw } from "@excalidraw/excalidraw";
import React, { useState, useEffect } from "react";
import "./Whiteboard.css";
import { geometryLibrary } from "../data/libraries/geometry";
import { notebooksLibrary } from "../data/libraries/notebooks";
import { mapsLibrary } from "../data/libraries/maps";
import { signsLibrary } from "../data/libraries/signs";

const allLibraries = [
    ...geometryLibrary,
    ...notebooksLibrary,
    ...mapsLibrary,
    ...signsLibrary
];

const Whiteboard: React.FC = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    // Logique pour rendre la barre d'outils déplaçable
    useEffect(() => {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const handleMouseDown = (e: MouseEvent) => {
            const handle = (e.target as HTMLElement).closest(".toolbar-drag-handle");
            if (!handle) return;

            const toolbar = handle.parentElement as HTMLElement;
            if (!toolbar) return;

            isDragging = true;
            const rect = toolbar.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            toolbar.style.transform = "none";
            toolbar.style.margin = "0";
            toolbar.style.left = `${rect.left}px`;
            toolbar.style.top = `${rect.top}px`;
            toolbar.style.bottom = "auto";
            document.body.style.cursor = "grabbing";

            e.preventDefault();
            e.stopPropagation();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const toolbar = document.querySelector(".App-toolbar") as HTMLElement;
            if (!toolbar) return;

            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            toolbar.style.left = `${newLeft}px`;
            toolbar.style.top = `${newTop}px`;

            // Mettre à jour les classes de position
            const isAtBottom = newTop + toolbar.offsetHeight / 2 > window.innerHeight / 2;
            document.body.classList.toggle("toolbar-at-bottom", isAtBottom);
            document.body.classList.toggle("toolbar-at-top", !isAtBottom);
            document.body.style.setProperty("--toolbar-left", `${newLeft + toolbar.offsetWidth / 2}px`);
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.cursor = "default";
        };

        const initToolbar = () => {
            const toolbar = document.querySelector(".App-toolbar") as HTMLElement;
            if (!toolbar || toolbar.querySelector(".toolbar-drag-handle")) return;

            const handle = document.createElement("div");
            handle.className = "toolbar-drag-handle";
            handle.title = "Saisir pour déplacer";
            handle.innerHTML = `<svg width="12" height="20" viewBox="0 0 12 20" fill="none"><circle cx="3" cy="3" r="1.5" fill="#ccc"/><circle cx="9" cy="3" r="1.5" fill="#ccc"/><circle cx="3" cy="10" r="1.5" fill="#ccc"/><circle cx="9" cy="10" r="1.5" fill="#ccc"/><circle cx="3" cy="17" r="1.5" fill="#ccc"/><circle cx="9" cy="17" r="1.5" fill="#ccc"/></svg>`;
            toolbar.prepend(handle);

            // Init classes
            const rect = toolbar.getBoundingClientRect();
            const isAtBottom = rect.top + rect.height / 2 > window.innerHeight / 2;
            document.body.classList.toggle("toolbar-at-bottom", isAtBottom);
            document.body.classList.toggle("toolbar-at-top", !isAtBottom);
            document.body.style.setProperty("--toolbar-left", `${rect.left + rect.width / 2}px`);
        };

        window.addEventListener("mousedown", handleMouseDown, true);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        const observer = new MutationObserver(initToolbar);
        observer.observe(document.body, { childList: true, subtree: true });
        initToolbar();

        return () => {
            window.removeEventListener("mousedown", handleMouseDown, true);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            observer.disconnect();
        };
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === "accepted") {
            setInstallPrompt(null);
        }
    };

    // Ne pas afficher de prompt d'installation si on est déjà sous Electron
    const isElectron = (window as any).electronAPI?.isElectron;

    return (
        <div className="whiteboard-container">
            <div className="eduboard-branding-minimal">
                <img src="/icon-192.png" alt="EduBoard Logo" className="branding-sticker" />
                <span className="vs-logo-text">VS-</span>
                <span className="eduboard-logo-text-minimal">EduBoard</span>
                {installPrompt && !isElectron && (
                    <button
                        onClick={handleInstallClick}
                        className="install-button"
                        title="Installer l'application sur votre appareil"
                    >
                        <span className="install-icon">⬇️</span>
                        Installer
                    </button>
                )}
            </div>

            <Excalidraw
                langCode="fr-FR"
                initialData={{
                    libraryItems: allLibraries as any,
                    appState: { viewBackgroundColor: "#ffffff" }
                }}
            />
        </div>
    );
};

export default Whiteboard;
