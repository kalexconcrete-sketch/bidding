/**
 * Don Smith Concrete Bid Pro - Estimation Engine
 * Comprehensive material database and calculation engine for concrete bidding
 * Version: 1.0.0
 */

// ============================================================================
// MATERIALS DATABASE
// ============================================================================

const MATERIALS_DATABASE = {
    concrete: [
        {
            id: 'conc-3000',
            name: '3000 PSI Standard',
            psi: 3000,
            pricePerCY: 125.00,
            description: 'Standard residential concrete for driveways, patios, sidewalks',
            minOrder: 1,
            cureTime: 28,
            slump: '4-5 inches'
        },
        {
            id: 'conc-4000',
            name: '4000 PSI High Strength',
            psi: 4000,
            pricePerCY: 135.00,
            description: 'Higher strength for garage floors, commercial slabs',
            minOrder: 1,
            cureTime: 28,
            slump: '4-5 inches'
        },
        {
            id: 'conc-5000',
            name: '5000 PSI Premium',
            psi: 5000,
            pricePerCY: 150.00,
            description: 'Premium strength for foundations, structural applications',
            minOrder: 1,
            cureTime: 28,
            slump: '4 inches'
        },
        {
            id: 'conc-fiber',
            name: 'Fiber Reinforced',
            psi: 4000,
            pricePerCY: 155.00,
            description: 'Contains fiber mesh for crack resistance',
            minOrder: 1,
            cureTime: 28,
            slump: '4-5 inches',
            fiberIncluded: true
        },
        {
            id: 'conc-stamped',
            name: 'Stamped Concrete Mix',
            psi: 4000,
            pricePerCY: 180.00,
            description: 'Optimized for stamping and decorative finishes',
            minOrder: 2,
            cureTime: 28,
            slump: '3-4 inches',
            decorative: true
        },
        {
            id: 'conc-colored',
            name: 'Integral Color Mix',
            psi: 4000,
            pricePerCY: 165.00,
            description: 'Pre-colored concrete, various colors available',
            minOrder: 2,
            cureTime: 28,
            slump: '4 inches',
            colorOptions: ['Buff', 'Terra Cotta', 'Charcoal', 'Slate Gray', 'Desert Sand']
        }
    ],

    rebar: [
        {
            id: 'rebar-3',
            name: '#3 Rebar (3/8")',
            size: 3,
            diameter: 0.375,
            pricePerLF: 0.45,
            weightPerLF: 0.376,
            description: 'Light duty reinforcement'
        },
        {
            id: 'rebar-4',
            name: '#4 Rebar (1/2")',
            size: 4,
            diameter: 0.5,
            pricePerLF: 0.55,
            weightPerLF: 0.668,
            description: 'Standard residential reinforcement'
        },
        {
            id: 'rebar-5',
            name: '#5 Rebar (5/8")',
            size: 5,
            diameter: 0.625,
            pricePerLF: 0.70,
            weightPerLF: 1.043,
            description: 'Heavy duty residential/light commercial'
        },
        {
            id: 'rebar-6',
            name: '#6 Rebar (3/4")',
            size: 6,
            diameter: 0.75,
            pricePerLF: 0.90,
            weightPerLF: 1.502,
            description: 'Commercial and structural applications'
        },
        {
            id: 'wire-mesh',
            name: 'Wire Mesh 6x6 W1.4/W1.4',
            size: 'mesh',
            pricePerSF: 0.85,
            sheetSize: { width: 5, length: 10 },
            description: 'Welded wire fabric for slab reinforcement'
        }
    ],

    forms: [
        {
            id: 'form-2x4',
            name: 'Wood Form 2x4',
            type: 'wood',
            dimensions: '2x4',
            pricePerLF: 1.50,
            maxHeight: 3.5,
            reusable: 3,
            description: 'Standard lumber forming for slabs up to 4"'
        },
        {
            id: 'form-2x6',
            name: 'Wood Form 2x6',
            type: 'wood',
            dimensions: '2x6',
            pricePerLF: 2.00,
            maxHeight: 5.5,
            reusable: 3,
            description: 'Standard lumber forming for slabs 4-6"'
        },
        {
            id: 'form-2x8',
            name: 'Wood Form 2x8',
            type: 'wood',
            dimensions: '2x8',
            pricePerLF: 2.75,
            maxHeight: 7.25,
            reusable: 3,
            description: 'Standard lumber forming for slabs 6-8"'
        },
        {
            id: 'form-2x10',
            name: 'Wood Form 2x10',
            type: 'wood',
            dimensions: '2x10',
            pricePerLF: 3.50,
            maxHeight: 9.25,
            reusable: 3,
            description: 'Deep slab and footing forms'
        },
        {
            id: 'form-2x12',
            name: 'Wood Form 2x12',
            type: 'wood',
            dimensions: '2x12',
            pricePerLF: 4.25,
            maxHeight: 11.25,
            reusable: 3,
            description: 'Foundation and deep footing forms'
        },
        {
            id: 'form-steel',
            name: 'Steel Form Rental',
            type: 'steel',
            pricePerSFDay: 0.15,
            minRental: 7,
            description: 'Reusable steel forms for foundations/walls'
        },
        {
            id: 'form-stake',
            name: 'Form Stakes',
            type: 'stake',
            pricePerEach: 1.25,
            spacing: 4,
            description: 'Wood or metal stakes for form support'
        }
    ],

    finishes: [
        {
            id: 'finish-broom',
            name: 'Broom Finish',
            type: 'standard',
            laborMultiplier: 1.0,
            materialCostPerSF: 0,
            description: 'Standard textured non-slip finish'
        },
        {
            id: 'finish-smooth',
            name: 'Smooth/Trowel Finish',
            type: 'standard',
            laborMultiplier: 1.2,
            materialCostPerSF: 0,
            description: 'Smooth steel troweled finish'
        },
        {
            id: 'finish-exposed',
            name: 'Exposed Aggregate',
            type: 'decorative',
            laborMultiplier: 1.5,
            materialCostPerSF: 2.50,
            description: 'Exposed stone/pebble decorative finish',
            requiresRetarder: true
        },
        {
            id: 'finish-stamped',
            name: 'Stamped Pattern',
            type: 'decorative',
            laborMultiplier: 2.0,
            materialCostPerSF: 4.00,
            description: 'Decorative stamped patterns',
            patterns: ['Ashlar Slate', 'Cobblestone', 'Brick', 'Wood Plank', 'Flagstone'],
            requiresColorRelease: true
        },
        {
            id: 'finish-salt',
            name: 'Salt Finish',
            type: 'decorative',
            laborMultiplier: 1.3,
            materialCostPerSF: 0.50,
            description: 'Textured pitted surface finish'
        },
        {
            id: 'finish-swirl',
            name: 'Swirl Finish',
            type: 'standard',
            laborMultiplier: 1.15,
            materialCostPerSF: 0,
            description: 'Decorative swirl pattern'
        }
    ],

    accessories: [
        {
            id: 'acc-vapor',
            name: 'Vapor Barrier (6 mil poly)',
            pricePerSF: 0.15,
            coverage: 1,
            overlap: 0.1,
            description: 'Moisture barrier under slabs'
        },
        {
            id: 'acc-vapor-10',
            name: 'Vapor Barrier (10 mil poly)',
            pricePerSF: 0.22,
            coverage: 1,
            overlap: 0.1,
            description: 'Heavy duty moisture barrier'
        },
        {
            id: 'acc-expansion',
            name: 'Expansion Joint Material',
            pricePerLF: 2.50,
            thickness: 0.5,
            description: 'Fiber expansion joint strips'
        },
        {
            id: 'acc-expansion-foam',
            name: 'Foam Expansion Joint',
            pricePerLF: 1.75,
            thickness: 0.5,
            description: 'Closed cell foam expansion strips'
        },
        {
            id: 'acc-curing',
            name: 'Curing Compound',
            pricePerSF: 0.35,
            coverage: 200,
            description: 'Liquid membrane curing compound (per SF coverage)'
        },
        {
            id: 'acc-curing-sheet',
            name: 'Curing Blankets',
            pricePerSF: 0.45,
            reusable: true,
            description: 'Wet cure blankets for cold weather'
        },
        {
            id: 'acc-fiber',
            name: 'Fiber Mesh Additive',
            pricePerCY: 0.75,
            type: 'polypropylene',
            description: 'Secondary crack control fiber'
        },
        {
            id: 'acc-fiber-steel',
            name: 'Steel Fiber Additive',
            pricePerCY: 35.00,
            type: 'steel',
            description: 'Steel fiber for industrial applications'
        },
        {
            id: 'acc-color-release',
            name: 'Color Release Agent',
            pricePerSF: 0.85,
            description: 'Release powder for stamped concrete'
        },
        {
            id: 'acc-sealer',
            name: 'Concrete Sealer',
            pricePerSF: 0.55,
            coverage: 300,
            description: 'Acrylic concrete sealer'
        },
        {
            id: 'acc-sealer-epoxy',
            name: 'Epoxy Sealer',
            pricePerSF: 1.25,
            coverage: 250,
            description: 'High-gloss epoxy sealer'
        },
        {
            id: 'acc-gravel',
            name: 'Compacted Gravel Base',
            pricePerSF: 0.75,
            depth: 4,
            description: 'Crushed gravel sub-base material'
        },
        {
            id: 'acc-sand',
            name: 'Sand Bedding',
            pricePerSF: 0.35,
            depth: 2,
            description: 'Leveling sand layer'
        },
        {
            id: 'acc-rebar-chair',
            name: 'Rebar Chairs',
            pricePerEach: 0.35,
            spacing: 4,
            description: 'Plastic rebar support chairs'
        },
        {
            id: 'acc-tie-wire',
            name: 'Tie Wire',
            pricePerLB: 2.50,
            description: 'Rebar tying wire'
        }
    ]
};


// ============================================================================
// LABOR RATES
// ============================================================================

const LABOR_RATES = {
    baseRate: 45.00, // Base hourly rate per worker

    tasks: [
        {
            id: 'task-form-setup',
            name: 'Form Setup',
            hoursPerUnit: 0.15,
            unit: 'LF',
            description: 'Install wood/steel formwork',
            crewSize: 2
        },
        {
            id: 'task-form-strip',
            name: 'Strip Forms',
            hoursPerUnit: 0.10,
            unit: 'LF',
            description: 'Remove formwork after cure',
            crewSize: 2
        },
        {
            id: 'task-pour',
            name: 'Pour Concrete',
            hoursPerUnit: 0.50,
            unit: 'CY',
            description: 'Place and spread concrete',
            crewSize: 4
        },
        {
            id: 'task-finish-broom',
            name: 'Broom Finish',
            hoursPerUnit: 0.02,
            unit: 'SF',
            description: 'Standard broom texture finish',
            crewSize: 2
        },
        {
            id: 'task-finish-smooth',
            name: 'Smooth Trowel Finish',
            hoursPerUnit: 0.025,
            unit: 'SF',
            description: 'Hand or power trowel smooth',
            crewSize: 2
        },
        {
            id: 'task-finish-exposed',
            name: 'Exposed Aggregate Finish',
            hoursPerUnit: 0.035,
            unit: 'SF',
            description: 'Wash and expose aggregate',
            crewSize: 3
        },
        {
            id: 'task-finish-stamped',
            name: 'Stamped Finish',
            hoursPerUnit: 0.05,
            unit: 'SF',
            description: 'Apply stamps and color release',
            crewSize: 3
        },
        {
            id: 'task-rebar',
            name: 'Rebar Placement',
            hoursPerUnit: 0.05,
            unit: 'LF',
            description: 'Cut, bend, tie rebar',
            crewSize: 2
        },
        {
            id: 'task-mesh',
            name: 'Wire Mesh Placement',
            hoursPerUnit: 0.008,
            unit: 'SF',
            description: 'Lay and tie wire mesh',
            crewSize: 2
        },
        {
            id: 'task-site-prep',
            name: 'Site Preparation',
            hoursPerUnit: 0.01,
            unit: 'SF',
            description: 'Grade, compact, prep subgrade',
            crewSize: 2
        },
        {
            id: 'task-excavate',
            name: 'Excavation',
            hoursPerUnit: 0.015,
            unit: 'SF',
            description: 'Hand excavation for depth',
            crewSize: 2
        },
        {
            id: 'task-gravel',
            name: 'Gravel Base Install',
            hoursPerUnit: 0.012,
            unit: 'SF',
            description: 'Spread and compact gravel',
            crewSize: 2
        },
        {
            id: 'task-vapor',
            name: 'Vapor Barrier Install',
            hoursPerUnit: 0.005,
            unit: 'SF',
            description: 'Lay and tape vapor barrier',
            crewSize: 2
        },
        {
            id: 'task-cure',
            name: 'Apply Curing Compound',
            hoursPerUnit: 0.003,
            unit: 'SF',
            description: 'Spray curing compound',
            crewSize: 1
        },
        {
            id: 'task-seal',
            name: 'Apply Sealer',
            hoursPerUnit: 0.008,
            unit: 'SF',
            description: 'Apply concrete sealer',
            crewSize: 2
        },
        {
            id: 'task-cleanup',
            name: 'Site Cleanup',
            hoursPerUnit: 0.25,
            unit: 'job',
            description: 'Final cleanup per job',
            crewSize: 2,
            flatRate: true,
            minHours: 2
        }
    ],

    crewTypes: [
        {
            id: 'crew-small',
            name: 'Small Crew',
            size: 2,
            hourlyRate: 90.00,
            description: 'Prep work, small pours',
            maxCYPerDay: 5
        },
        {
            id: 'crew-standard',
            name: 'Standard Crew',
            size: 4,
            hourlyRate: 180.00,
            description: 'Typical residential pours',
            maxCYPerDay: 15
        },
        {
            id: 'crew-large',
            name: 'Large Crew',
            size: 6,
            hourlyRate: 270.00,
            description: 'Commercial/large residential',
            maxCYPerDay: 30
        },
        {
            id: 'crew-finishing',
            name: 'Finishing Crew',
            size: 3,
            hourlyRate: 165.00,
            description: 'Specialized finishing work',
            specialty: 'decorative'
        }
    ],

    overtime: {
        threshold: 8,
        multiplier: 1.5,
        doubleTimeThreshold: 12,
        doubleTimeMultiplier: 2.0,
        weekendMultiplier: 1.5
    },

    minimums: {
        callOutHours: 4,
        smallJobMinimum: 500
    }
};


// ============================================================================
// EQUIPMENT RATES
// ============================================================================

const EQUIPMENT_RATES = [
    {
        id: 'equip-pump',
        name: 'Concrete Pump Truck',
        dailyRate: 850.00,
        hourlyRate: 175.00,
        minCharge: 4,
        unit: 'day',
        description: 'Line pump for residential/commercial',
        capacity: '80 CY/hour',
        includes: ['operator', 'setup']
    },
    {
        id: 'equip-boom-pump',
        name: 'Boom Pump Truck',
        dailyRate: 1250.00,
        hourlyRate: 250.00,
        minCharge: 4,
        unit: 'day',
        description: 'Boom pump for hard-to-reach areas',
        capacity: '150 CY/hour',
        includes: ['operator', 'setup']
    },
    {
        id: 'equip-mixer-delivery',
        name: 'Mixer Truck Delivery',
        ratePerLoad: 150.00,
        unit: 'load',
        loadSize: 10,
        description: 'Ready-mix delivery charge',
        waitTime: 25.00,
        waitTimeUnit: 'per 15 min after first hour'
    },
    {
        id: 'equip-short-load',
        name: 'Short Load Fee',
        feePerCY: 35.00,
        threshold: 5,
        unit: 'CY',
        description: 'Fee for orders under 5 CY'
    },
    {
        id: 'equip-trowel',
        name: 'Power Trowel',
        dailyRate: 125.00,
        weeklyRate: 450.00,
        unit: 'day',
        description: 'Walk-behind power trowel',
        size: '36 inch'
    },
    {
        id: 'equip-trowel-ride',
        name: 'Ride-On Power Trowel',
        dailyRate: 275.00,
        weeklyRate: 950.00,
        unit: 'day',
        description: 'Ride-on trowel for large slabs',
        size: '48 inch dual'
    },
    {
        id: 'equip-vibrator',
        name: 'Concrete Vibrator',
        dailyRate: 75.00,
        weeklyRate: 275.00,
        unit: 'day',
        description: 'Internal concrete vibrator',
        headSize: '1.5 inch'
    },
    {
        id: 'equip-vibrator-heavy',
        name: 'Heavy Duty Vibrator',
        dailyRate: 125.00,
        weeklyRate: 425.00,
        unit: 'day',
        description: 'Large vibrator for deep pours',
        headSize: '2.5 inch'
    },
    {
        id: 'equip-laser',
        name: 'Laser Level',
        dailyRate: 50.00,
        weeklyRate: 175.00,
        unit: 'day',
        description: 'Rotary laser for grade work'
    },
    {
        id: 'equip-screed',
        name: 'Vibratory Screed',
        dailyRate: 150.00,
        weeklyRate: 525.00,
        unit: 'day',
        description: 'Power screed for flatwork',
        lengths: ['8 ft', '10 ft', '12 ft']
    },
    {
        id: 'equip-saw',
        name: 'Concrete Saw',
        dailyRate: 95.00,
        weeklyRate: 350.00,
        unit: 'day',
        description: 'Walk-behind concrete saw',
        bladeSize: '14 inch'
    },
    {
        id: 'equip-stamp-set',
        name: 'Stamp Set Rental',
        dailyRate: 75.00,
        weeklyRate: 250.00,
        unit: 'day',
        description: 'Decorative stamp set with tools',
        patterns: 'various'
    },
    {
        id: 'equip-wheelbarrow',
        name: 'Wheelbarrow',
        dailyRate: 15.00,
        unit: 'day',
        description: 'Contractor wheelbarrow',
        capacity: '6 cu ft'
    },
    {
        id: 'equip-buggy',
        name: 'Concrete Buggy',
        dailyRate: 185.00,
        weeklyRate: 650.00,
        unit: 'day',
        description: 'Powered concrete buggy',
        capacity: '16 cu ft'
    },
    {
        id: 'equip-compactor',
        name: 'Plate Compactor',
        dailyRate: 85.00,
        weeklyRate: 300.00,
        unit: 'day',
        description: 'Vibratory plate compactor for base'
    },
    {
        id: 'equip-generator',
        name: 'Generator',
        dailyRate: 95.00,
        weeklyRate: 350.00,
        unit: 'day',
        description: 'Portable generator for tools',
        size: '6500W'
    }
];


// ============================================================================
// CALCULATION ENGINE
// ============================================================================

const EstimationEngine = {
    // Constants
    CUBIC_FEET_PER_YARD: 27,
    INCHES_PER_FOOT: 12,

    /**
     * Calculate concrete volume needed
     * @param {number} length - Length in specified unit
     * @param {number} width - Width in specified unit
     * @param {number} depth - Depth/thickness in inches
     * @param {string} unit - 'feet' or 'inches'
     * @returns {object} Volume calculations
     */
    calculateVolume(length, width, depth, unit = 'feet') {
        // Convert to feet if needed
        let lengthFt = unit === 'inches' ? length / this.INCHES_PER_FOOT : length;
        let widthFt = unit === 'inches' ? width / this.INCHES_PER_FOOT : width;
        let depthFt = depth / this.INCHES_PER_FOOT; // Depth always in inches

        const sqft = lengthFt * widthFt;
        const cubicFeet = sqft * depthFt;
        const cubicYards = cubicFeet / this.CUBIC_FEET_PER_YARD;

        return {
            squareFeet: Math.round(sqft * 100) / 100,
            cubicFeet: Math.round(cubicFeet * 100) / 100,
            cubicYards: Math.round(cubicYards * 100) / 100,
            perimeter: Math.round((lengthFt + widthFt) * 2 * 100) / 100,
            dimensions: { length: lengthFt, width: widthFt, depth: depthFt }
        };
    },

    /**
     * Calculate rebar requirements
     * @param {number} length - Length in feet
     * @param {number} width - Width in feet
     * @param {number} spacing - Grid spacing in inches
     * @param {string} size - Rebar size (#3, #4, etc.) or 'mesh'
     * @returns {object} Rebar calculations
     */
    calculateRebar(length, width, spacing, size = '#4') {
        const spacingFt = spacing / this.INCHES_PER_FOOT;

        if (size === 'mesh') {
            const meshMaterial = MATERIALS_DATABASE.rebar.find(r => r.id === 'wire-mesh');
            const sqft = length * width;
            // Add 10% for overlap
            const sheetsNeeded = Math.ceil((sqft * 1.1) /
                (meshMaterial.sheetSize.width * meshMaterial.sheetSize.length));

            return {
                type: 'mesh',
                squareFeet: sqft,
                sheetsNeeded: sheetsNeeded,
                totalSF: sheetsNeeded * meshMaterial.sheetSize.width * meshMaterial.sheetSize.length,
                pricePerSF: meshMaterial.pricePerSF,
                totalCost: Math.round(sqft * 1.1 * meshMaterial.pricePerSF * 100) / 100
            };
        }

        // Calculate rebar grid
        const lengthwiseBars = Math.ceil(width / spacingFt) + 1;
        const widthwiseBars = Math.ceil(length / spacingFt) + 1;
        const totalLengthwiseLF = lengthwiseBars * length;
        const totalWidthwiseLF = widthwiseBars * width;
        const totalLF = totalLengthwiseLF + totalWidthwiseLF;

        // Find rebar material
        const rebarSize = size.replace('#', '');
        const rebarMaterial = MATERIALS_DATABASE.rebar.find(r => r.size === parseInt(rebarSize));

        // Add 10% for laps and waste
        const totalLFWithWaste = totalLF * 1.1;

        return {
            type: 'rebar',
            size: size,
            spacing: spacing,
            lengthwiseBars: lengthwiseBars,
            widthwiseBars: widthwiseBars,
            totalLinearFeet: Math.round(totalLF * 100) / 100,
            totalLFWithWaste: Math.round(totalLFWithWaste * 100) / 100,
            pricePerLF: rebarMaterial ? rebarMaterial.pricePerLF : 0,
            totalCost: rebarMaterial ? Math.round(totalLFWithWaste * rebarMaterial.pricePerLF * 100) / 100 : 0,
            weight: rebarMaterial ? Math.round(totalLFWithWaste * rebarMaterial.weightPerLF) : 0
        };
    },

    /**
     * Calculate formwork requirements
     * @param {number} perimeter - Perimeter in linear feet
     * @param {number} height - Form height needed in inches
     * @returns {object} Formwork calculations
     */
    calculateFormwork(perimeter, height) {
        // Determine appropriate form size based on height
        let formType;
        if (height <= 3.5) {
            formType = MATERIALS_DATABASE.forms.find(f => f.id === 'form-2x4');
        } else if (height <= 5.5) {
            formType = MATERIALS_DATABASE.forms.find(f => f.id === 'form-2x6');
        } else if (height <= 7.25) {
            formType = MATERIALS_DATABASE.forms.find(f => f.id === 'form-2x8');
        } else if (height <= 9.25) {
            formType = MATERIALS_DATABASE.forms.find(f => f.id === 'form-2x10');
        } else {
            formType = MATERIALS_DATABASE.forms.find(f => f.id === 'form-2x12');
        }

        // Calculate stakes needed (every 4 feet)
        const stakeData = MATERIALS_DATABASE.forms.find(f => f.id === 'form-stake');
        const stakesNeeded = Math.ceil(perimeter / stakeData.spacing) + 4; // Extra for corners

        const formCost = perimeter * formType.pricePerLF;
        const stakeCost = stakesNeeded * stakeData.pricePerEach;

        return {
            formType: formType.name,
            formId: formType.id,
            linearFeet: perimeter,
            pricePerLF: formType.pricePerLF,
            formCost: Math.round(formCost * 100) / 100,
            stakesNeeded: stakesNeeded,
            stakeCost: Math.round(stakeCost * 100) / 100,
            totalCost: Math.round((formCost + stakeCost) * 100) / 100,
            reusable: formType.reusable
        };
    },

    /**
     * Calculate labor costs
     * @param {array} tasks - Array of task IDs to include
     * @param {number} sqft - Square footage
     * @param {number} cyds - Cubic yards
     * @param {number} perimeterLF - Perimeter in linear feet
     * @param {string} finishType - Finish type ID
     * @returns {object} Labor calculations
     */
    calculateLabor(tasks, sqft, cyds, perimeterLF, finishType = 'finish-broom') {
        const laborItems = [];
        let totalHours = 0;

        tasks.forEach(taskId => {
            const task = LABOR_RATES.tasks.find(t => t.id === taskId);
            if (!task) return;

            let hours = 0;
            let quantity = 0;

            switch (task.unit) {
                case 'SF':
                    quantity = sqft;
                    hours = sqft * task.hoursPerUnit;
                    break;
                case 'CY':
                    quantity = cyds;
                    hours = cyds * task.hoursPerUnit;
                    break;
                case 'LF':
                    quantity = perimeterLF;
                    hours = perimeterLF * task.hoursPerUnit;
                    break;
                case 'job':
                    quantity = 1;
                    hours = task.minHours || task.hoursPerUnit;
                    break;
            }

            // Apply finish multiplier if applicable
            if (task.id.includes('finish') && finishType) {
                const finish = MATERIALS_DATABASE.finishes.find(f => f.id === finishType);
                if (finish) {
                    hours *= finish.laborMultiplier;
                }
            }

            const crewHours = hours;
            const cost = crewHours * task.crewSize * LABOR_RATES.baseRate;

            laborItems.push({
                taskId: task.id,
                taskName: task.name,
                quantity: Math.round(quantity * 100) / 100,
                unit: task.unit,
                hoursPerUnit: task.hoursPerUnit,
                crewSize: task.crewSize,
                totalHours: Math.round(crewHours * 100) / 100,
                laborCost: Math.round(cost * 100) / 100
            });

            totalHours += crewHours;
        });

        const totalCost = laborItems.reduce((sum, item) => sum + item.laborCost, 0);

        return {
            items: laborItems,
            totalHours: Math.round(totalHours * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            baseRate: LABOR_RATES.baseRate
        };
    },

    /**
     * Calculate equipment costs
     * @param {number} cyds - Cubic yards
     * @param {number} days - Estimated project days
     * @param {object} options - Equipment options
     * @returns {object} Equipment calculations
     */
    calculateEquipment(cyds, days, options = {}) {
        const equipment = [];
        let totalCost = 0;

        // Delivery charges
        const deliveryEquip = EQUIPMENT_RATES.find(e => e.id === 'equip-mixer-delivery');
        const loadsNeeded = Math.ceil(cyds / deliveryEquip.loadSize);
        const deliveryCost = loadsNeeded * deliveryEquip.ratePerLoad;
        equipment.push({
            id: 'equip-mixer-delivery',
            name: deliveryEquip.name,
            quantity: loadsNeeded,
            unit: 'loads',
            rate: deliveryEquip.ratePerLoad,
            cost: deliveryCost
        });
        totalCost += deliveryCost;

        // Short load fee if applicable
        if (cyds < 5) {
            const shortLoadEquip = EQUIPMENT_RATES.find(e => e.id === 'equip-short-load');
            const shortLoadFee = (5 - cyds) * shortLoadEquip.feePerCY;
            equipment.push({
                id: 'equip-short-load',
                name: shortLoadEquip.name,
                quantity: 5 - cyds,
                unit: 'CY under minimum',
                rate: shortLoadEquip.feePerCY,
                cost: shortLoadFee
            });
            totalCost += shortLoadFee;
        }

        // Pump truck if specified or if large pour
        if (options.usePump || cyds > 10) {
            const pumpEquip = EQUIPMENT_RATES.find(e => e.id === 'equip-pump');
            const pumpCost = pumpEquip.dailyRate * Math.max(1, Math.ceil(cyds / 40));
            equipment.push({
                id: 'equip-pump',
                name: pumpEquip.name,
                quantity: Math.max(1, Math.ceil(cyds / 40)),
                unit: 'days',
                rate: pumpEquip.dailyRate,
                cost: pumpCost
            });
            totalCost += pumpCost;
        }

        // Power trowel if large area
        if (options.usePowerTrowel || options.sqft > 500) {
            const trowelEquip = EQUIPMENT_RATES.find(e => e.id === 'equip-trowel');
            const trowelCost = trowelEquip.dailyRate * days;
            equipment.push({
                id: 'equip-trowel',
                name: trowelEquip.name,
                quantity: days,
                unit: 'days',
                rate: trowelEquip.dailyRate,
                cost: trowelCost
            });
            totalCost += trowelCost;
        }

        // Vibrator
        if (options.useVibrator || cyds > 5) {
            const vibratorEquip = EQUIPMENT_RATES.find(e => e.id === 'equip-vibrator');
            const vibratorCost = vibratorEquip.dailyRate * days;
            equipment.push({
                id: 'equip-vibrator',
                name: vibratorEquip.name,
                quantity: days,
                unit: 'days',
                rate: vibratorEquip.dailyRate,
                cost: vibratorCost
            });
            totalCost += vibratorCost;
        }

        // Laser level
        if (options.useLaser) {
            const laserEquip = EQUIPMENT_RATES.find(e => e.id === 'equip-laser');
            const laserCost = laserEquip.dailyRate * days;
            equipment.push({
                id: 'equip-laser',
                name: laserEquip.name,
                quantity: days,
                unit: 'days',
                rate: laserEquip.dailyRate,
                cost: laserCost
            });
            totalCost += laserCost;
        }

        // Stamp set if decorative
        if (options.stamped) {
            const stampEquip = EQUIPMENT_RATES.find(e => e.id === 'equip-stamp-set');
            const stampCost = stampEquip.dailyRate * days;
            equipment.push({
                id: 'equip-stamp-set',
                name: stampEquip.name,
                quantity: days,
                unit: 'days',
                rate: stampEquip.dailyRate,
                cost: stampCost
            });
            totalCost += stampCost;
        }

        return {
            items: equipment,
            totalCost: Math.round(totalCost * 100) / 100
        };
    },

    /**
     * Apply waste factor to a quantity
     * @param {number} quantity - Base quantity
     * @param {number} factor - Waste factor (e.g., 0.05 for 5%)
     * @returns {object} Adjusted quantity
     */
    applyWasteFactor(quantity, factor = 0.05) {
        const waste = quantity * factor;
        const adjusted = quantity + waste;

        return {
            original: quantity,
            wasteFactor: factor,
            wastePercentage: factor * 100,
            wasteAmount: Math.round(waste * 100) / 100,
            adjusted: Math.round(adjusted * 100) / 100
        };
    },

    /**
     * Calculate total project cost
     * @param {number} materialsCost - Total materials cost
     * @param {number} laborCost - Total labor cost
     * @param {number} equipmentCost - Total equipment cost
     * @param {number} overheadPercent - Overhead percentage
     * @param {number} profitPercent - Profit margin percentage
     * @param {number} contingencyPercent - Contingency percentage
     * @returns {object} Total calculations
     */
    calculateTotal(materialsCost, laborCost, equipmentCost, overheadPercent = 10, profitPercent = 15, contingencyPercent = 5) {
        const subtotal = materialsCost + laborCost + equipmentCost;
        const overhead = subtotal * (overheadPercent / 100);
        const subtotalWithOverhead = subtotal + overhead;
        const profit = subtotalWithOverhead * (profitPercent / 100);
        const subtotalWithProfit = subtotalWithOverhead + profit;
        const contingency = subtotalWithProfit * (contingencyPercent / 100);
        const grandTotal = subtotalWithProfit + contingency;

        return {
            materialsCost: Math.round(materialsCost * 100) / 100,
            laborCost: Math.round(laborCost * 100) / 100,
            equipmentCost: Math.round(equipmentCost * 100) / 100,
            subtotal: Math.round(subtotal * 100) / 100,
            overhead: {
                percent: overheadPercent,
                amount: Math.round(overhead * 100) / 100
            },
            subtotalWithOverhead: Math.round(subtotalWithOverhead * 100) / 100,
            profit: {
                percent: profitPercent,
                amount: Math.round(profit * 100) / 100
            },
            subtotalWithProfit: Math.round(subtotalWithProfit * 100) / 100,
            contingency: {
                percent: contingencyPercent,
                amount: Math.round(contingency * 100) / 100
            },
            grandTotal: Math.round(grandTotal * 100) / 100,
            pricePerSF: null, // Set by caller if sqft known
            pricePerCY: null  // Set by caller if cyds known
        };
    },

    /**
     * Generate complete estimate from project data
     * @param {object} projectData - Project specifications
     * @returns {object} Complete estimate
     */
    generateEstimate(projectData) {
        const {
            length,
            width,
            depth,
            unit = 'feet',
            concreteType = 'conc-4000',
            reinforcement = { type: 'mesh' },
            finish = 'finish-broom',
            includeGravelBase = false,
            includeVaporBarrier = false,
            includeSealer = false,
            overheadPercent = 10,
            profitPercent = 15,
            contingencyPercent = 5,
            wasteFactor = 0.05,
            equipmentOptions = {}
        } = projectData;

        // Calculate dimensions
        const volume = this.calculateVolume(length, width, depth, unit);
        const volumeWithWaste = this.applyWasteFactor(volume.cubicYards, wasteFactor);

        // Get concrete pricing
        const concrete = MATERIALS_DATABASE.concrete.find(c => c.id === concreteType);
        const concreteCost = volumeWithWaste.adjusted * concrete.pricePerCY;

        // Calculate reinforcement
        let rebarCalc;
        if (reinforcement.type === 'mesh') {
            rebarCalc = this.calculateRebar(volume.dimensions.length, volume.dimensions.width, 0, 'mesh');
        } else {
            rebarCalc = this.calculateRebar(
                volume.dimensions.length,
                volume.dimensions.width,
                reinforcement.spacing || 12,
                reinforcement.size || '#4'
            );
        }

        // Calculate formwork
        const formwork = this.calculateFormwork(volume.perimeter, depth);

        // Get finish details
        const finishData = MATERIALS_DATABASE.finishes.find(f => f.id === finish);
        const finishMaterialCost = volume.squareFeet * finishData.materialCostPerSF;

        // Calculate accessories
        let accessoryCost = 0;
        const accessories = [];

        if (includeGravelBase) {
            const gravel = MATERIALS_DATABASE.accessories.find(a => a.id === 'acc-gravel');
            const gravelCost = volume.squareFeet * gravel.pricePerSF;
            accessories.push({ name: gravel.name, cost: gravelCost });
            accessoryCost += gravelCost;
        }

        if (includeVaporBarrier) {
            const vapor = MATERIALS_DATABASE.accessories.find(a => a.id === 'acc-vapor');
            const vaporSF = volume.squareFeet * (1 + vapor.overlap);
            const vaporCost = vaporSF * vapor.pricePerSF;
            accessories.push({ name: vapor.name, cost: vaporCost });
            accessoryCost += vaporCost;
        }

        if (includeSealer) {
            const sealer = MATERIALS_DATABASE.accessories.find(a => a.id === 'acc-sealer');
            const sealerCost = volume.squareFeet * sealer.pricePerSF;
            accessories.push({ name: sealer.name, cost: sealerCost });
            accessoryCost += sealerCost;
        }

        // Curing compound
        const curing = MATERIALS_DATABASE.accessories.find(a => a.id === 'acc-curing');
        const curingCost = volume.squareFeet * curing.pricePerSF;
        accessories.push({ name: curing.name, cost: curingCost });
        accessoryCost += curingCost;

        // Total materials
        const totalMaterialsCost = concreteCost + rebarCalc.totalCost + formwork.totalCost +
                                   finishMaterialCost + accessoryCost;

        // Calculate labor
        const laborTasks = [
            'task-site-prep',
            'task-form-setup',
            reinforcement.type === 'mesh' ? 'task-mesh' : 'task-rebar',
            'task-pour',
            finish === 'finish-broom' ? 'task-finish-broom' :
            finish === 'finish-smooth' ? 'task-finish-smooth' :
            finish === 'finish-exposed' ? 'task-finish-exposed' :
            finish === 'finish-stamped' ? 'task-finish-stamped' : 'task-finish-broom',
            'task-form-strip',
            'task-cure',
            'task-cleanup'
        ];

        if (includeGravelBase) laborTasks.unshift('task-gravel');
        if (includeVaporBarrier) laborTasks.push('task-vapor');
        if (includeSealer) laborTasks.push('task-seal');

        const labor = this.calculateLabor(
            laborTasks,
            volume.squareFeet,
            volumeWithWaste.adjusted,
            volume.perimeter,
            finish
        );

        // Calculate equipment
        const estDays = Math.ceil(volumeWithWaste.adjusted / 15); // ~15 CY per day
        const equipment = this.calculateEquipment(volumeWithWaste.adjusted, estDays, {
            ...equipmentOptions,
            sqft: volume.squareFeet,
            stamped: finish === 'finish-stamped'
        });

        // Calculate totals
        const totals = this.calculateTotal(
            totalMaterialsCost,
            labor.totalCost,
            equipment.totalCost,
            overheadPercent,
            profitPercent,
            contingencyPercent
        );

        totals.pricePerSF = Math.round((totals.grandTotal / volume.squareFeet) * 100) / 100;
        totals.pricePerCY = Math.round((totals.grandTotal / volumeWithWaste.adjusted) * 100) / 100;

        return {
            projectName: projectData.projectName || 'Untitled Project',
            dateGenerated: new Date().toISOString(),
            dimensions: {
                length: volume.dimensions.length,
                width: volume.dimensions.width,
                depth: depth,
                unit: 'feet/inches'
            },
            area: {
                squareFeet: volume.squareFeet,
                perimeter: volume.perimeter
            },
            volume: {
                cubicYards: volume.cubicYards,
                cubicYardsWithWaste: volumeWithWaste.adjusted,
                wasteFactor: wasteFactor,
                wasteAmount: volumeWithWaste.wasteAmount
            },
            materials: {
                concrete: {
                    type: concrete.name,
                    psi: concrete.psi,
                    quantity: volumeWithWaste.adjusted,
                    pricePerCY: concrete.pricePerCY,
                    cost: Math.round(concreteCost * 100) / 100
                },
                reinforcement: rebarCalc,
                formwork: formwork,
                finish: {
                    type: finishData.name,
                    laborMultiplier: finishData.laborMultiplier,
                    materialCost: Math.round(finishMaterialCost * 100) / 100
                },
                accessories: accessories,
                totalMaterialsCost: Math.round(totalMaterialsCost * 100) / 100
            },
            labor: labor,
            equipment: equipment,
            estimatedDays: estDays,
            totals: totals
        };
    }
};


// ============================================================================
// QUICK QUOTE CALCULATOR
// ============================================================================

const QuickQuote = {
    /**
     * Standard project defaults
     */
    defaults: {
        driveway: { depth: 4, concrete: 'conc-4000', reinforcement: 'mesh', finish: 'finish-broom' },
        patio: { depth: 4, concrete: 'conc-4000', reinforcement: 'mesh', finish: 'finish-broom' },
        sidewalk: { depth: 4, concrete: 'conc-4000', reinforcement: 'mesh', finish: 'finish-broom' },
        foundation: { depth: 8, concrete: 'conc-4000', reinforcement: '#4', finish: 'finish-smooth' },
        slab: { depth: 4, concrete: 'conc-4000', reinforcement: 'mesh', finish: 'finish-smooth' }
    },

    /**
     * Regional price adjustments
     */
    regionalFactors: {
        low: 0.85,    // Rural/low cost areas
        medium: 1.0,  // Average markets
        high: 1.25,   // High cost urban areas
        premium: 1.5  // Premium markets (CA, NY, etc.)
    },

    /**
     * Calculate price range
     * @param {number} basePrice - Base calculated price
     * @returns {object} Low, mid, high estimates
     */
    getPriceRange(basePrice) {
        return {
            low: Math.round(basePrice * 0.85),
            mid: Math.round(basePrice),
            high: Math.round(basePrice * 1.20)
        };
    },

    /**
     * Quick quote for driveway
     * @param {number} length - Length in feet
     * @param {number} width - Width in feet
     * @param {object} options - Optional overrides
     * @returns {object} Quick quote estimate
     */
    driveway(length, width, options = {}) {
        const sqft = length * width;
        const defaults = this.defaults.driveway;
        const depth = options.depth || defaults.depth;

        // Base price per SF for driveway (includes typical margins)
        const basePricePerSF = 8.50;
        const basePrice = sqft * basePricePerSF;

        // Adjustments
        let adjustedPrice = basePrice;
        if (options.stamped) adjustedPrice *= 1.6;
        if (options.colored) adjustedPrice *= 1.15;
        if (options.exposedAggregate) adjustedPrice *= 1.35;
        if (depth > 4) adjustedPrice *= 1 + ((depth - 4) * 0.1);
        if (sqft < 200) adjustedPrice *= 1.2; // Small job premium

        const range = this.getPriceRange(adjustedPrice);

        return {
            type: 'Driveway',
            dimensions: { length, width, depth },
            squareFeet: sqft,
            estimate: range,
            pricePerSF: {
                low: Math.round(range.low / sqft * 100) / 100,
                mid: Math.round(range.mid / sqft * 100) / 100,
                high: Math.round(range.high / sqft * 100) / 100
            },
            includes: [
                'Site preparation',
                'Formwork',
                'Wire mesh reinforcement',
                `${depth}" ${options.stamped ? 'stamped' : 'standard'} concrete`,
                options.stamped ? 'Stamped finish' : 'Broom finish',
                'Curing compound',
                'Form removal & cleanup'
            ],
            notes: this.generateNotes('driveway', sqft, options),
            validFor: '30 days'
        };
    },

    /**
     * Quick quote for patio
     * @param {number} length - Length in feet
     * @param {number} width - Width in feet
     * @param {object} options - Optional overrides
     * @returns {object} Quick quote estimate
     */
    patio(length, width, options = {}) {
        const sqft = length * width;
        const defaults = this.defaults.patio;
        const depth = options.depth || defaults.depth;

        // Base price per SF for patio
        const basePricePerSF = 9.00;
        const basePrice = sqft * basePricePerSF;

        let adjustedPrice = basePrice;
        if (options.stamped) adjustedPrice *= 1.65;
        if (options.colored) adjustedPrice *= 1.15;
        if (options.exposedAggregate) adjustedPrice *= 1.40;
        if (options.sealer) adjustedPrice += sqft * 0.55;
        if (sqft < 150) adjustedPrice *= 1.25; // Small job premium

        const range = this.getPriceRange(adjustedPrice);

        return {
            type: 'Patio',
            dimensions: { length, width, depth },
            squareFeet: sqft,
            estimate: range,
            pricePerSF: {
                low: Math.round(range.low / sqft * 100) / 100,
                mid: Math.round(range.mid / sqft * 100) / 100,
                high: Math.round(range.high / sqft * 100) / 100
            },
            includes: [
                'Site preparation & grading',
                'Formwork',
                'Wire mesh reinforcement',
                `${depth}" concrete`,
                options.stamped ? 'Decorative stamped finish' : 'Broom or smooth finish',
                options.sealer ? 'Concrete sealer' : 'Curing compound',
                'Form removal & cleanup'
            ],
            notes: this.generateNotes('patio', sqft, options),
            validFor: '30 days'
        };
    },

    /**
     * Quick quote for sidewalk
     * @param {number} length - Length in feet
     * @param {number} width - Width in feet (typically 3-5 ft)
     * @param {object} options - Optional overrides
     * @returns {object} Quick quote estimate
     */
    sidewalk(length, width, options = {}) {
        const sqft = length * width;
        const defaults = this.defaults.sidewalk;
        const depth = options.depth || defaults.depth;

        // Base price per SF for sidewalk
        const basePricePerSF = 10.00;
        const basePrice = sqft * basePricePerSF;

        let adjustedPrice = basePrice;
        if (options.stamped) adjustedPrice *= 1.5;
        if (options.colored) adjustedPrice *= 1.12;
        if (length > 100) adjustedPrice *= 0.92; // Volume discount
        if (sqft < 100) adjustedPrice *= 1.3; // Small job premium

        const range = this.getPriceRange(adjustedPrice);

        // Calculate linear feet for alternate pricing
        const linearFeet = length;

        return {
            type: 'Sidewalk',
            dimensions: { length, width, depth },
            squareFeet: sqft,
            linearFeet: linearFeet,
            estimate: range,
            pricePerSF: {
                low: Math.round(range.low / sqft * 100) / 100,
                mid: Math.round(range.mid / sqft * 100) / 100,
                high: Math.round(range.high / sqft * 100) / 100
            },
            pricePerLF: {
                low: Math.round(range.low / linearFeet * 100) / 100,
                mid: Math.round(range.mid / linearFeet * 100) / 100,
                high: Math.round(range.high / linearFeet * 100) / 100
            },
            includes: [
                'Excavation & site prep',
                'Compacted gravel base',
                'Formwork',
                'Wire mesh reinforcement',
                `${depth}" concrete`,
                'Broom finish (non-slip)',
                'Control joints every 4-5 ft',
                'Curing & cleanup'
            ],
            notes: this.generateNotes('sidewalk', sqft, options),
            validFor: '30 days'
        };
    },

    /**
     * Quick quote for foundation
     * @param {number} length - Length in feet
     * @param {number} width - Width in feet
     * @param {number} depth - Depth in inches
     * @param {object} options - Optional overrides
     * @returns {object} Quick quote estimate
     */
    foundation(length, width, depth = 8, options = {}) {
        const sqft = length * width;
        const defaults = this.defaults.foundation;
        const actualDepth = depth || defaults.depth;

        // Base price per SF for foundation (higher due to rebar, thicker concrete)
        const basePricePerSF = 12.50;
        const basePrice = sqft * basePricePerSF;

        let adjustedPrice = basePrice;
        adjustedPrice *= (actualDepth / 8); // Scale with depth
        if (options.footings) adjustedPrice *= 1.35; // Add footings
        if (options.waterproofing) adjustedPrice += sqft * 1.50;
        if (sqft < 500) adjustedPrice *= 1.15; // Small job premium

        const range = this.getPriceRange(adjustedPrice);

        // Calculate cubic yards
        const cyds = (sqft * (actualDepth / 12)) / 27;

        return {
            type: 'Foundation Slab',
            dimensions: { length, width, depth: actualDepth },
            squareFeet: sqft,
            cubicYards: Math.round(cyds * 100) / 100,
            estimate: range,
            pricePerSF: {
                low: Math.round(range.low / sqft * 100) / 100,
                mid: Math.round(range.mid / sqft * 100) / 100,
                high: Math.round(range.high / sqft * 100) / 100
            },
            pricePerCY: {
                low: Math.round(range.low / cyds),
                mid: Math.round(range.mid / cyds),
                high: Math.round(range.high / cyds)
            },
            includes: [
                'Excavation & grading',
                'Compacted gravel base (4")',
                'Vapor barrier',
                'Formwork',
                '#4 rebar on 12" centers',
                `${actualDepth}" 4000 PSI concrete`,
                'Steel trowel finish',
                'Curing compound',
                'Form removal & backfill'
            ],
            notes: this.generateNotes('foundation', sqft, { ...options, depth: actualDepth }),
            validFor: '30 days'
        };
    },

    /**
     * Quick quote for general slab by square footage
     * @param {number} sqft - Square footage
     * @param {number} thickness - Thickness in inches
     * @param {object} options - Optional overrides
     * @returns {object} Quick quote estimate
     */
    slab(sqft, thickness = 4, options = {}) {
        const defaults = this.defaults.slab;

        // Base price per SF
        const basePricePerSF = 8.00;
        const basePrice = sqft * basePricePerSF;

        let adjustedPrice = basePrice;
        if (thickness > 4) adjustedPrice *= 1 + ((thickness - 4) * 0.12);
        if (options.stamped) adjustedPrice *= 1.65;
        if (options.colored) adjustedPrice *= 1.15;
        if (options.exposedAggregate) adjustedPrice *= 1.40;
        if (options.polished) adjustedPrice *= 1.80;
        if (options.sealer) adjustedPrice += sqft * 0.55;
        if (sqft < 200) adjustedPrice *= 1.20; // Small job premium
        if (sqft > 1000) adjustedPrice *= 0.92; // Volume discount

        const range = this.getPriceRange(adjustedPrice);

        // Calculate cubic yards
        const cyds = (sqft * (thickness / 12)) / 27;

        return {
            type: 'Concrete Slab',
            dimensions: { thickness },
            squareFeet: sqft,
            cubicYards: Math.round(cyds * 100) / 100,
            estimate: range,
            pricePerSF: {
                low: Math.round(range.low / sqft * 100) / 100,
                mid: Math.round(range.mid / sqft * 100) / 100,
                high: Math.round(range.high / sqft * 100) / 100
            },
            includes: [
                'Site preparation',
                'Formwork',
                'Wire mesh reinforcement',
                `${thickness}" concrete`,
                options.stamped ? 'Decorative stamped finish' :
                options.polished ? 'Polished finish' : 'Standard finish',
                'Curing compound',
                'Form removal & cleanup'
            ],
            notes: this.generateNotes('slab', sqft, { ...options, thickness }),
            validFor: '30 days'
        };
    },

    /**
     * Generate contextual notes for quote
     * @param {string} type - Project type
     * @param {number} sqft - Square footage
     * @param {object} options - Options selected
     * @returns {array} Array of notes
     */
    generateNotes(type, sqft, options) {
        const notes = [];

        notes.push('Estimate assumes normal site conditions and access');
        notes.push('Final price subject to site inspection');

        if (sqft < 200) {
            notes.push('Small job minimum may apply');
        }

        if (options.stamped || options.colored || options.exposedAggregate) {
            notes.push('Decorative finishes require color selection before scheduling');
        }

        if (type === 'foundation') {
            notes.push('Permit and inspection fees not included');
            notes.push('Engineering certification available at additional cost');
        }

        if (type === 'driveway') {
            notes.push('Removal of existing concrete quoted separately');
            notes.push('Recommend 24-hour cure time before foot traffic, 7 days for vehicles');
        }

        if (options.depth > 6 || options.thickness > 6) {
            notes.push('Thicker pours may require multiple truck loads');
        }

        notes.push('Price valid for 30 days from quote date');

        return notes;
    },

    /**
     * Apply regional adjustment to quote
     * @param {object} quote - Quote object from quick quote method
     * @param {string} region - Region key (low, medium, high, premium)
     * @returns {object} Adjusted quote
     */
    applyRegionalFactor(quote, region = 'medium') {
        const factor = this.regionalFactors[region] || 1.0;

        return {
            ...quote,
            estimate: {
                low: Math.round(quote.estimate.low * factor),
                mid: Math.round(quote.estimate.mid * factor),
                high: Math.round(quote.estimate.high * factor)
            },
            pricePerSF: {
                low: Math.round(quote.pricePerSF.low * factor * 100) / 100,
                mid: Math.round(quote.pricePerSF.mid * factor * 100) / 100,
                high: Math.round(quote.pricePerSF.high * factor * 100) / 100
            },
            regionalAdjustment: {
                region: region,
                factor: factor
            }
        };
    },

    /**
     * Compare multiple project options
     * @param {number} length - Length in feet
     * @param {number} width - Width in feet
     * @returns {object} Comparison of finish options
     */
    compareFinishes(length, width) {
        const sqft = length * width;

        return {
            dimensions: { length, width },
            squareFeet: sqft,
            options: [
                {
                    finish: 'Standard Broom',
                    estimate: this.patio(length, width).estimate,
                    description: 'Basic non-slip texture'
                },
                {
                    finish: 'Colored Concrete',
                    estimate: this.patio(length, width, { colored: true }).estimate,
                    description: 'Integral color throughout'
                },
                {
                    finish: 'Exposed Aggregate',
                    estimate: this.patio(length, width, { exposedAggregate: true }).estimate,
                    description: 'Decorative stone/pebble surface'
                },
                {
                    finish: 'Stamped Pattern',
                    estimate: this.patio(length, width, { stamped: true }).estimate,
                    description: 'Decorative stamped patterns available'
                },
                {
                    finish: 'Stamped + Sealed',
                    estimate: this.patio(length, width, { stamped: true, sealer: true }).estimate,
                    description: 'Premium decorative with sealer'
                }
            ]
        };
    }
};


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const ConcreteUtils = {
    /**
     * Convert between units
     */
    convert: {
        feetToInches: (ft) => ft * 12,
        inchesToFeet: (inches) => inches / 12,
        sqftToSqYards: (sqft) => sqft / 9,
        cubicFeetToCubicYards: (cf) => cf / 27,
        cubicYardsToCubicFeet: (cy) => cy * 27,
        metersToFeet: (m) => m * 3.28084,
        feetToMeters: (ft) => ft / 3.28084
    },

    /**
     * Format currency
     */
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    /**
     * Format number with commas
     */
    formatNumber: (num, decimals = 2) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    },

    /**
     * Calculate concrete needed for circular slab
     */
    circularSlab: (diameter, depth) => {
        const radius = diameter / 2;
        const sqft = Math.PI * radius * radius;
        const depthFt = depth / 12;
        const cubicFeet = sqft * depthFt;
        const cubicYards = cubicFeet / 27;

        return {
            diameter: diameter,
            depth: depth,
            squareFeet: Math.round(sqft * 100) / 100,
            cubicYards: Math.round(cubicYards * 100) / 100,
            circumference: Math.round(Math.PI * diameter * 100) / 100
        };
    },

    /**
     * Calculate steps/stairs concrete
     */
    stairs: (width, riserHeight, treadDepth, numberOfSteps) => {
        // Each step is a trapezoidal prism
        const riserFt = riserHeight / 12;
        const treadFt = treadDepth / 12;

        // Volume per step
        const stepVolume = width * treadFt * riserFt;
        const totalVolume = stepVolume * numberOfSteps;

        // Landing area if applicable
        const totalCubicYards = totalVolume / 27;

        return {
            width: width,
            riserHeight: riserHeight,
            treadDepth: treadDepth,
            numberOfSteps: numberOfSteps,
            totalRise: numberOfSteps * riserHeight,
            totalRun: numberOfSteps * treadDepth,
            cubicYards: Math.round(totalCubicYards * 100) / 100,
            formworkLF: Math.round((width * 2 + (numberOfSteps * treadDepth / 12)) * 100) / 100
        };
    },

    /**
     * Get material by ID
     */
    getMaterial: (category, id) => {
        return MATERIALS_DATABASE[category]?.find(item => item.id === id);
    },

    /**
     * Get equipment by ID
     */
    getEquipment: (id) => {
        return EQUIPMENT_RATES.find(item => item.id === id);
    },

    /**
     * Get labor task by ID
     */
    getLaborTask: (id) => {
        return LABOR_RATES.tasks.find(task => task.id === id);
    }
};


// ============================================================================
// EXPORT FOR MODULE USAGE
// ============================================================================

// Check if we're in a module environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MATERIALS_DATABASE,
        LABOR_RATES,
        EQUIPMENT_RATES,
        EstimationEngine,
        QuickQuote,
        ConcreteUtils
    };
}

// For browser/global usage
if (typeof window !== 'undefined') {
    window.DonSmithBidPro = {
        MATERIALS_DATABASE,
        LABOR_RATES,
        EQUIPMENT_RATES,
        EstimationEngine,
        QuickQuote,
        ConcreteUtils
    };
}
