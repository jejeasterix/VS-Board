export const notebooksLibrary = [
    // Ligne simple
    {
        id: "ligne_simple",
        status: "published",
        created: 1,
        elements: [
            {
                type: "line",
                version: 1,
                versionNonce: 0,
                isDeleted: false,
                id: "id_ligne_1",
                fillStyle: "hachure",
                strokeWidth: 2,
                strokeStyle: "solid",
                roughness: 0,
                opacity: 50,
                angle: 0,
                x: 0,
                y: 0,
                strokeColor: "#009FE3", // Ligne bleue VS
                backgroundColor: "transparent",
                width: 800,
                height: 0,
                seed: 1,
                groupIds: [],
                strokeSharpness: "sharp",
                boundElements: [],
                updated: 1,
                link: null,
                locked: false,
                points: [[0, 0], [800, 0]],
            }
        ]
    },
    // Cadre Seyès (Simulation de carreaux) - Simplified for MVP
    {
        id: "seyes_frame",
        status: "published",
        created: 1,
        elements: [
            {
                type: "rectangle",
                x: 0,
                y: 0,
                width: 800,
                height: 600,
                strokeColor: "#e0e0e0",
                backgroundColor: "transparent",
                fillStyle: "solid",
                strokeWidth: 1,
                strokeStyle: "solid",
                roughness: 0,
                opacity: 100,
                groupIds: [],
                strokeSharpness: "sharp",
                seed: 123,
                version: 1,
                versionNonce: 0,
                isDeleted: false,
                boundElements: [],
                updated: 1,
                link: null,
                locked: true, // Fond verrouillé
            },
            // Horizontal lines logic would correspond to many lines, simpler to just have a grid image or pattern in real app
            // For MVP, we provide a "Gros carreaux" group
        ]
    }
];
