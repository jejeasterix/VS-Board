export const mapsLibrary = [
    // France (Simplified Polygon)
    {
        id: "carte_france",
        status: "published",
        created: 1,
        elements: [
            {
                type: "line", // Polyligne fermée
                x: 0,
                y: 0,
                width: 400,
                height: 400,
                strokeColor: "#010202",
                backgroundColor: "transparent",
                fillStyle: "hachure",
                strokeWidth: 2,
                strokeStyle: "solid",
                roughness: 1,
                opacity: 100,
                groupIds: [],
                strokeSharpness: "round",
                seed: 1234,
                version: 1,
                versionNonce: 0,
                isDeleted: false,
                boundElements: [],
                updated: 1,
                link: null,
                locked: false,
                points: [[130, 0], [250, 20], [300, 100], [250, 200], [300, 300], [150, 350], [50, 250], [0, 100], [130, 0]], // Hexagone grossier pour MVP
            }
        ]
    }
];
