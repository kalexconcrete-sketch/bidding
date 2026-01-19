/**
 * Don Smith Concrete Bid Pro - AI Analysis & Smart Recommendations
 * Comprehensive bidding intelligence system for concrete contractors
 */

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

const BidConfig = {
    // Price per SF ranges by project type
    priceRanges: {
        basic_slab: { low: 6, mid: 9, high: 12 },
        driveway: { low: 8, mid: 11, high: 15 },
        sidewalk: { low: 7, mid: 10, high: 14 },
        patio: { low: 8, mid: 12, high: 18 },
        stamped: { low: 12, mid: 18, high: 28 },
        decorative: { low: 15, mid: 22, high: 35 },
        colored: { low: 10, mid: 15, high: 22 },
        foundation: { low: 10, mid: 14, high: 20 },
        commercial: { low: 8, mid: 12, high: 18 },
        parking_lot: { low: 6, mid: 9, high: 14 },
        pool_deck: { low: 12, mid: 18, high: 30 }
    },

    // Concrete yield: roughly 1 CY per 80 SF at 4" thickness
    concreteYieldSF: 80, // SF per CY at 4" thickness

    // Labor to material ratio targets
    laborMaterialRatio: { min: 0.30, target: 0.40, max: 0.50 },

    // Overhead and profit targets
    overheadRange: { min: 0.08, target: 0.12, max: 0.18 },
    profitRange: { min: 0.08, target: 0.15, max: 0.25 },

    // Risk thresholds
    riskThresholds: {
        low: 35,
        medium: 65,
        high: 100
    },

    // Project size categories (SF)
    projectSizes: {
        small: 500,
        medium: 2000,
        large: 5000,
        xlarge: 10000
    }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const BidUtils = {
    /**
     * Calculate price per square foot
     */
    calculatePricePerSF(totalPrice, squareFeet) {
        if (!squareFeet || squareFeet <= 0) return 0;
        return totalPrice / squareFeet;
    },

    /**
     * Calculate expected concrete yards needed
     */
    calculateExpectedConcreteYards(squareFeet, thicknessInches = 4) {
        const thicknessFactor = thicknessInches / 4;
        return (squareFeet / BidConfig.concreteYieldSF) * thicknessFactor;
    },

    /**
     * Normalize project type string
     */
    normalizeProjectType(type) {
        if (!type) return 'basic_slab';
        return type.toLowerCase().replace(/[\s-]/g, '_');
    },

    /**
     * Get price range for project type
     */
    getPriceRange(projectType) {
        const normalized = this.normalizeProjectType(projectType);
        return BidConfig.priceRanges[normalized] || BidConfig.priceRanges.basic_slab;
    },

    /**
     * Simple sigmoid function for probability calculations
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Calculate standard deviation
     */
    standardDeviation(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    },

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    /**
     * Format percentage
     */
    formatPercent(value) {
        return `${(value * 100).toFixed(1)}%`;
    }
};

// =============================================================================
// PRICING ANALYZER
// =============================================================================

/**
 * Analyze bid pricing against historical data and market rates
 * @param {Object} bid - Current bid data
 * @param {Array} history - Historical bid data
 * @returns {Object} Pricing analysis results
 */
function analyzePricing(bid, history = []) {
    const squareFeet = bid.squareFeet || bid.totalSF || bid.sf || 0;
    const totalPrice = bid.totalPrice || bid.total || bid.price || 0;
    const projectType = bid.projectType || bid.type || 'basic_slab';

    // Calculate current price per SF
    const pricePerSF = BidUtils.calculatePricePerSF(totalPrice, squareFeet);

    // Get market range for this project type
    const marketRange = BidUtils.getPriceRange(projectType);

    // Filter relevant historical data
    const relevantHistory = history.filter(h => {
        const histType = BidUtils.normalizeProjectType(h.projectType || h.type);
        const bidType = BidUtils.normalizeProjectType(projectType);
        return histType === bidType || !h.projectType;
    });

    // Calculate historical statistics
    let historicalAvg = marketRange.mid;
    let winningAvg = marketRange.mid;
    let losingAvg = marketRange.high;

    if (relevantHistory.length > 0) {
        const allPricesPerSF = relevantHistory
            .map(h => BidUtils.calculatePricePerSF(h.totalPrice || h.price, h.squareFeet || h.sf))
            .filter(p => p > 0);

        if (allPricesPerSF.length > 0) {
            historicalAvg = allPricesPerSF.reduce((a, b) => a + b, 0) / allPricesPerSF.length;
        }

        const wins = relevantHistory.filter(h => h.won === true || h.status === 'won');
        const losses = relevantHistory.filter(h => h.won === false || h.status === 'lost');

        if (wins.length > 0) {
            const winPrices = wins
                .map(h => BidUtils.calculatePricePerSF(h.totalPrice || h.price, h.squareFeet || h.sf))
                .filter(p => p > 0);
            if (winPrices.length > 0) {
                winningAvg = winPrices.reduce((a, b) => a + b, 0) / winPrices.length;
            }
        }

        if (losses.length > 0) {
            const lossPrices = losses
                .map(h => BidUtils.calculatePricePerSF(h.totalPrice || h.price, h.squareFeet || h.sf))
                .filter(p => p > 0);
            if (lossPrices.length > 0) {
                losingAvg = lossPrices.reduce((a, b) => a + b, 0) / lossPrices.length;
            }
        }
    }

    // Calculate win probability using simple logistic regression
    const winProbability = calculateWinProbability(pricePerSF, winningAvg, losingAvg, marketRange);

    // Generate recommendation
    const recommendation = generatePricingRecommendation(pricePerSF, marketRange, winningAvg, winProbability);

    // Calculate optimal price range
    const optimalLow = Math.min(winningAvg * 0.95, marketRange.mid);
    const optimalHigh = Math.min(winningAvg * 1.05, marketRange.high * 0.9);

    return {
        pricePerSF: Math.round(pricePerSF * 100) / 100,
        marketLow: marketRange.low,
        marketMid: marketRange.mid,
        marketHigh: marketRange.high,
        historicalAverage: Math.round(historicalAvg * 100) / 100,
        winningAverage: Math.round(winningAvg * 100) / 100,
        losingAverage: Math.round(losingAvg * 100) / 100,
        optimalRange: {
            low: Math.round(optimalLow * 100) / 100,
            high: Math.round(optimalHigh * 100) / 100
        },
        recommendation: recommendation,
        winProbability: Math.round(winProbability * 1000) / 10, // Percentage with 1 decimal
        competitiveness: getCompetitivenessRating(pricePerSF, marketRange, winningAvg),
        suggestedTotal: squareFeet > 0 ? Math.round(squareFeet * winningAvg) : null
    };
}

/**
 * Calculate win probability using logistic model
 */
function calculateWinProbability(pricePerSF, winningAvg, losingAvg, marketRange) {
    if (pricePerSF <= 0) return 0;

    // Base probability on distance from winning average
    const spread = losingAvg - winningAvg;
    const midpoint = (winningAvg + losingAvg) / 2;

    // Logistic function: probability decreases as price increases above winning average
    // Using a sensitivity factor based on historical spread
    const sensitivity = spread > 0 ? 4 / spread : 0.5;
    const x = (midpoint - pricePerSF) * sensitivity;

    let probability = BidUtils.sigmoid(x);

    // Adjust for market extremes
    if (pricePerSF < marketRange.low) {
        probability = Math.min(probability * 1.1, 0.95); // Very competitive but cap at 95%
    } else if (pricePerSF > marketRange.high) {
        probability *= 0.5; // Significantly reduce if above market high
    }

    return BidUtils.clamp(probability, 0.05, 0.95);
}

/**
 * Generate pricing recommendation text
 */
function generatePricingRecommendation(pricePerSF, marketRange, winningAvg, winProbability) {
    const recommendations = [];

    if (pricePerSF < marketRange.low) {
        recommendations.push({
            type: 'warning',
            message: `Price ($${pricePerSF.toFixed(2)}/SF) is below market low. Consider if you're leaving money on the table or missing costs.`
        });
    } else if (pricePerSF > marketRange.high) {
        recommendations.push({
            type: 'warning',
            message: `Price ($${pricePerSF.toFixed(2)}/SF) exceeds market high. Win probability is significantly reduced unless you have a strong relationship or unique value.`
        });
    } else if (pricePerSF > marketRange.mid && pricePerSF <= marketRange.high) {
        recommendations.push({
            type: 'info',
            message: `Price is in upper market range. Good for premium work or established customers.`
        });
    } else if (pricePerSF >= marketRange.low && pricePerSF <= marketRange.mid) {
        recommendations.push({
            type: 'success',
            message: `Price is competitive within market range.`
        });
    }

    // Compare to winning average
    const diffFromWinning = ((pricePerSF - winningAvg) / winningAvg) * 100;
    if (Math.abs(diffFromWinning) > 10) {
        if (diffFromWinning > 0) {
            recommendations.push({
                type: 'info',
                message: `${diffFromWinning.toFixed(1)}% above your typical winning bid price.`
            });
        } else {
            recommendations.push({
                type: 'success',
                message: `${Math.abs(diffFromWinning).toFixed(1)}% below your typical winning bid price - competitive!`
            });
        }
    }

    // Win probability advice
    if (winProbability < 0.3) {
        recommendations.push({
            type: 'warning',
            message: `Low win probability (${(winProbability * 100).toFixed(0)}%). Consider reducing price or highlighting unique value.`
        });
    } else if (winProbability > 0.7) {
        recommendations.push({
            type: 'success',
            message: `Strong win probability (${(winProbability * 100).toFixed(0)}%). You might have room to increase margin.`
        });
    }

    return recommendations;
}

/**
 * Get competitiveness rating
 */
function getCompetitivenessRating(pricePerSF, marketRange, winningAvg) {
    if (pricePerSF <= winningAvg * 0.9) return 'Very Competitive';
    if (pricePerSF <= winningAvg) return 'Competitive';
    if (pricePerSF <= marketRange.mid) return 'Market Rate';
    if (pricePerSF <= marketRange.high) return 'Premium';
    return 'Above Market';
}

// =============================================================================
// RISK SCORER
// =============================================================================

/**
 * Calculate comprehensive risk score for a project
 * @param {Object} project - Project details
 * @returns {Object} Risk assessment with score, level, and factors
 */
function calculateRiskScore(project) {
    const factors = [];
    let totalScore = 0;
    let totalWeight = 0;

    // 1. Project Size Risk (0-20 points, weight: 1.0)
    const sizeRisk = calculateSizeRisk(project);
    factors.push(sizeRisk);
    totalScore += sizeRisk.score * sizeRisk.weight;
    totalWeight += sizeRisk.weight;

    // 2. Customer Payment History (0-20 points, weight: 1.2)
    const paymentRisk = calculatePaymentRisk(project);
    factors.push(paymentRisk);
    totalScore += paymentRisk.score * paymentRisk.weight;
    totalWeight += paymentRisk.weight;

    // 3. Project Complexity (0-20 points, weight: 1.0)
    const complexityRisk = calculateComplexityRisk(project);
    factors.push(complexityRisk);
    totalScore += complexityRisk.score * complexityRisk.weight;
    totalWeight += complexityRisk.weight;

    // 4. Weather/Season Risk (0-15 points, weight: 0.8)
    const weatherRisk = calculateWeatherRisk(project);
    factors.push(weatherRisk);
    totalScore += weatherRisk.score * weatherRisk.weight;
    totalWeight += weatherRisk.weight;

    // 5. Competition Level (0-10 points, weight: 0.7)
    const competitionRisk = calculateCompetitionRisk(project);
    factors.push(competitionRisk);
    totalScore += competitionRisk.score * competitionRisk.weight;
    totalWeight += competitionRisk.weight;

    // 6. Timeline Tightness (0-15 points, weight: 1.0)
    const timelineRisk = calculateTimelineRisk(project);
    factors.push(timelineRisk);
    totalScore += timelineRisk.score * timelineRisk.weight;
    totalWeight += timelineRisk.weight;

    // Calculate weighted average and normalize to 0-100
    const normalizedScore = Math.round((totalScore / totalWeight) * (100 / 20));
    const finalScore = BidUtils.clamp(normalizedScore, 0, 100);

    // Determine risk level
    let level, levelDescription;
    if (finalScore <= BidConfig.riskThresholds.low) {
        level = 'Low';
        levelDescription = 'This project has manageable risks. Standard precautions apply.';
    } else if (finalScore <= BidConfig.riskThresholds.medium) {
        level = 'Medium';
        levelDescription = 'This project has elevated risks. Consider additional contingency and closer management.';
    } else {
        level = 'High';
        levelDescription = 'This project has significant risks. Ensure adequate contingency, clear contract terms, and close oversight.';
    }

    // Generate recommendations based on risk factors
    const recommendations = generateRiskRecommendations(factors, finalScore);

    return {
        score: finalScore,
        level: level,
        levelDescription: levelDescription,
        factors: factors,
        recommendations: recommendations,
        suggestedContingency: calculateSuggestedContingency(finalScore)
    };
}

function calculateSizeRisk(project) {
    const sf = project.squareFeet || project.totalSF || project.sf || 0;
    const value = project.totalPrice || project.value || project.price || 0;

    let score = 0;
    let description = '';

    if (sf > BidConfig.projectSizes.xlarge || value > 100000) {
        score = 20;
        description = 'Very large project - significant resource commitment and exposure';
    } else if (sf > BidConfig.projectSizes.large || value > 50000) {
        score = 15;
        description = 'Large project - substantial commitment required';
    } else if (sf > BidConfig.projectSizes.medium || value > 20000) {
        score = 10;
        description = 'Medium project - moderate risk level';
    } else if (sf > BidConfig.projectSizes.small || value > 5000) {
        score = 5;
        description = 'Small project - lower risk exposure';
    } else {
        score = 2;
        description = 'Very small project - minimal risk';
    }

    return {
        name: 'Project Size',
        score: score,
        maxScore: 20,
        weight: 1.0,
        description: description,
        icon: 'ruler'
    };
}

function calculatePaymentRisk(project) {
    const customer = project.customer || project.client || {};
    const paymentHistory = customer.paymentHistory || project.paymentHistory || 'unknown';
    const isNewCustomer = customer.isNew || project.isNewCustomer || false;
    const creditScore = customer.creditScore || project.creditScore || null;

    let score = 10; // Default to moderate risk
    let description = '';

    if (paymentHistory === 'excellent' || paymentHistory === 'always_on_time') {
        score = 2;
        description = 'Excellent payment history - low payment risk';
    } else if (paymentHistory === 'good' || paymentHistory === 'usually_on_time') {
        score = 5;
        description = 'Good payment history - minor payment risk';
    } else if (paymentHistory === 'fair' || paymentHistory === 'sometimes_late') {
        score = 12;
        description = 'Fair payment history - moderate payment risk';
    } else if (paymentHistory === 'poor' || paymentHistory === 'often_late') {
        score = 18;
        description = 'Poor payment history - high payment risk';
    } else if (isNewCustomer) {
        score = 10;
        description = 'New customer - unknown payment behavior';
    } else {
        score = 10;
        description = 'Payment history unknown - exercise caution';
    }

    // Adjust for credit score if available
    if (creditScore !== null) {
        if (creditScore >= 750) score = Math.max(score - 3, 0);
        else if (creditScore < 600) score = Math.min(score + 5, 20);
    }

    return {
        name: 'Customer Payment History',
        score: score,
        maxScore: 20,
        weight: 1.2,
        description: description,
        icon: 'credit-card'
    };
}

function calculateComplexityRisk(project) {
    const projectType = BidUtils.normalizeProjectType(project.projectType || project.type);
    const hasCustomWork = project.hasCustomWork || project.customWork || false;
    const requiresEngineering = project.requiresEngineering || project.engineered || false;
    const accessDifficulty = project.accessDifficulty || project.siteAccess || 'normal';
    const slopeGrade = project.slopeGrade || project.grade || 'flat';

    let score = 5; // Base complexity
    let factors = [];

    // Project type complexity
    const complexTypes = ['stamped', 'decorative', 'foundation', 'commercial'];
    if (complexTypes.includes(projectType)) {
        score += 5;
        factors.push('complex finish type');
    }

    // Custom work
    if (hasCustomWork) {
        score += 4;
        factors.push('custom work required');
    }

    // Engineering requirements
    if (requiresEngineering) {
        score += 3;
        factors.push('engineering required');
    }

    // Access difficulty
    if (accessDifficulty === 'difficult' || accessDifficulty === 'limited') {
        score += 4;
        factors.push('difficult site access');
    } else if (accessDifficulty === 'very_difficult') {
        score += 6;
        factors.push('very difficult site access');
    }

    // Slope/grade
    if (slopeGrade === 'moderate' || slopeGrade === 'sloped') {
        score += 2;
        factors.push('sloped terrain');
    } else if (slopeGrade === 'steep') {
        score += 5;
        factors.push('steep terrain');
    }

    score = Math.min(score, 20);
    const description = factors.length > 0
        ? `Complexity factors: ${factors.join(', ')}`
        : 'Standard complexity level';

    return {
        name: 'Project Complexity',
        score: score,
        maxScore: 20,
        weight: 1.0,
        description: description,
        icon: 'puzzle'
    };
}

function calculateWeatherRisk(project) {
    const startDate = project.startDate || project.scheduledDate || new Date();
    const location = project.location || project.region || 'midwest';

    const date = new Date(startDate);
    const month = date.getMonth(); // 0-11

    let score = 5; // Base weather risk
    let description = '';

    // Seasonal risk (assuming US midwest/northeast climate)
    if (month >= 11 || month <= 2) { // Dec, Jan, Feb, Mar
        score = 15;
        description = 'Winter months - high freeze/weather risk';
    } else if (month === 3 || month === 10) { // April, November
        score = 12;
        description = 'Transitional season - moderate weather risk';
    } else if (month >= 4 && month <= 5) { // May, June
        score = 8;
        description = 'Spring - potential rain delays';
    } else if (month >= 6 && month <= 8) { // July, Aug, Sept
        score = 4;
        description = 'Summer - optimal concrete weather';
    } else { // September, October
        score = 6;
        description = 'Fall - generally good conditions';
    }

    // Regional adjustments
    const hotRegions = ['southwest', 'texas', 'arizona', 'florida'];
    const coldRegions = ['alaska', 'minnesota', 'wisconsin', 'michigan', 'northeast'];
    const wetRegions = ['pacific_northwest', 'seattle', 'washington', 'oregon'];

    const normalizedLocation = location.toLowerCase().replace(/[\s-]/g, '_');

    if (hotRegions.some(r => normalizedLocation.includes(r)) && month >= 5 && month <= 8) {
        score = Math.min(score + 3, 15);
        description += ' (hot climate adjustment)';
    }
    if (coldRegions.some(r => normalizedLocation.includes(r))) {
        score = Math.min(score + 2, 15);
    }
    if (wetRegions.some(r => normalizedLocation.includes(r))) {
        score = Math.min(score + 3, 15);
    }

    return {
        name: 'Weather/Season',
        score: score,
        maxScore: 15,
        weight: 0.8,
        description: description,
        icon: 'cloud'
    };
}

function calculateCompetitionRisk(project) {
    const competitorCount = project.competitorCount || project.competitors || project.numBidders || 0;
    const competitionLevel = project.competitionLevel || project.competition || 'unknown';

    let score = 5; // Default moderate competition
    let description = '';

    if (competitorCount > 0) {
        if (competitorCount >= 5) {
            score = 10;
            description = `High competition - ${competitorCount} known bidders`;
        } else if (competitorCount >= 3) {
            score = 7;
            description = `Moderate competition - ${competitorCount} known bidders`;
        } else {
            score = 4;
            description = `Low competition - ${competitorCount} known bidders`;
        }
    } else if (competitionLevel === 'high' || competitionLevel === 'heavy') {
        score = 10;
        description = 'High competition level expected';
    } else if (competitionLevel === 'low' || competitionLevel === 'light') {
        score = 3;
        description = 'Low competition level expected';
    } else if (competitionLevel === 'none' || competitionLevel === 'sole_source') {
        score = 1;
        description = 'Sole source or no competition';
    } else {
        score = 5;
        description = 'Competition level unknown';
    }

    return {
        name: 'Competition Level',
        score: score,
        maxScore: 10,
        weight: 0.7,
        description: description,
        icon: 'users'
    };
}

function calculateTimelineRisk(project) {
    const requestedDuration = project.requestedDuration || project.durationDays || null;
    const estimatedDuration = project.estimatedDuration || project.typicalDuration || null;
    const deadline = project.deadline || project.dueDate || null;
    const startDate = project.startDate || new Date();

    let score = 5; // Default moderate timeline risk
    let description = '';

    // Check if timeline is tighter than typical
    if (requestedDuration && estimatedDuration) {
        const ratio = requestedDuration / estimatedDuration;
        if (ratio < 0.5) {
            score = 15;
            description = 'Very tight timeline - significant overtime/rush risk';
        } else if (ratio < 0.75) {
            score = 12;
            description = 'Tight timeline - may require expedited work';
        } else if (ratio < 1.0) {
            score = 8;
            description = 'Slightly compressed timeline';
        } else {
            score = 3;
            description = 'Adequate timeline for project scope';
        }
    } else if (deadline) {
        const start = new Date(startDate);
        const end = new Date(deadline);
        const daysAvailable = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (daysAvailable < 7) {
            score = 15;
            description = `Very tight deadline - only ${daysAvailable} days`;
        } else if (daysAvailable < 14) {
            score = 10;
            description = `Tight deadline - ${daysAvailable} days`;
        } else if (daysAvailable < 30) {
            score = 6;
            description = `Moderate timeline - ${daysAvailable} days`;
        } else {
            score = 3;
            description = `Comfortable timeline - ${daysAvailable} days`;
        }
    } else {
        description = 'Timeline not specified';
    }

    return {
        name: 'Timeline Tightness',
        score: score,
        maxScore: 15,
        weight: 1.0,
        description: description,
        icon: 'clock'
    };
}

function generateRiskRecommendations(factors, totalScore) {
    const recommendations = [];

    // Sort factors by weighted score (highest risk first)
    const sortedFactors = [...factors].sort((a, b) =>
        (b.score / b.maxScore) - (a.score / a.maxScore)
    );

    // Generate recommendations for top risk factors
    sortedFactors.slice(0, 3).forEach(factor => {
        const riskPercent = (factor.score / factor.maxScore) * 100;
        if (riskPercent > 60) {
            recommendations.push({
                factor: factor.name,
                priority: 'high',
                message: getMitigationAdvice(factor.name, 'high')
            });
        } else if (riskPercent > 40) {
            recommendations.push({
                factor: factor.name,
                priority: 'medium',
                message: getMitigationAdvice(factor.name, 'medium')
            });
        }
    });

    // Overall recommendations based on total score
    if (totalScore > 65) {
        recommendations.push({
            factor: 'Overall',
            priority: 'high',
            message: 'Consider requiring progress payments, securing material early, and building in schedule buffers.'
        });
    }

    return recommendations;
}

function getMitigationAdvice(factorName, severity) {
    const advice = {
        'Project Size': {
            high: 'Consider breaking into phases, require progress payments, secure bonding if needed.',
            medium: 'Ensure adequate crew availability and material ordering lead times.'
        },
        'Customer Payment History': {
            high: 'Require deposit (30-50%), progress payments, and consider credit check. Include clear payment terms in contract.',
            medium: 'Require deposit and establish clear payment milestones.'
        },
        'Project Complexity': {
            high: 'Add contingency (15-20%), ensure experienced crew assignment, consider subcontractor backup.',
            medium: 'Review specifications carefully, verify all custom details before starting.'
        },
        'Weather/Season': {
            high: 'Include weather delay clause, have backup work available, consider weather contingency.',
            medium: 'Monitor forecast closely, have weather backup plan ready.'
        },
        'Competition Level': {
            high: 'Focus on value differentiation, relationship building, and realistic pricing.',
            medium: 'Ensure competitive pricing while maintaining margins.'
        },
        'Timeline Tightness': {
            high: 'Include overtime in estimate, secure materials early, have backup crew available.',
            medium: 'Plan efficient sequencing and confirm material availability.'
        }
    };

    return advice[factorName]?.[severity] || 'Review and address this risk factor in your bid.';
}

function calculateSuggestedContingency(riskScore) {
    // Base contingency 5%, increases with risk
    if (riskScore <= 25) return 0.05;       // 5% for low risk
    if (riskScore <= 40) return 0.08;       // 8% for low-medium
    if (riskScore <= 55) return 0.10;       // 10% for medium
    if (riskScore <= 70) return 0.12;       // 12% for medium-high
    if (riskScore <= 85) return 0.15;       // 15% for high
    return 0.20;                             // 20% for very high
}

// =============================================================================
// MISSING ITEMS DETECTOR
// =============================================================================

/**
 * Detect potentially missing items in a bid
 * @param {Object} bid - Bid data with line items
 * @returns {Array} List of potentially missing items
 */
function detectMissingItems(bid) {
    const projectType = BidUtils.normalizeProjectType(bid.projectType || bid.type || 'basic_slab');
    const lineItems = bid.lineItems || bid.items || [];
    const squareFeet = bid.squareFeet || bid.totalSF || bid.sf || 0;

    // Normalize existing items to lowercase for comparison
    const existingItems = new Set(
        lineItems.map(item => {
            const name = item.name || item.description || item.item || '';
            return name.toLowerCase().replace(/[^a-z0-9]/g, '');
        })
    );

    // Define standard checklist items with details
    const checklistItems = getChecklistForProjectType(projectType);

    const missingItems = [];

    checklistItems.forEach(checkItem => {
        // Check if any of the keywords match existing items
        const isPresent = checkItem.keywords.some(keyword => {
            const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
            return Array.from(existingItems).some(existing =>
                existing.includes(normalizedKeyword) || normalizedKeyword.includes(existing)
            );
        });

        if (!isPresent) {
            // Calculate estimated cost based on project size
            const estimatedCost = calculateItemEstimate(checkItem, squareFeet, projectType);

            missingItems.push({
                item: checkItem.name,
                category: checkItem.category,
                importance: checkItem.importance,
                estimatedCost: estimatedCost,
                estimatedRange: checkItem.costRange ? {
                    low: Math.round(squareFeet * checkItem.costRange.low),
                    high: Math.round(squareFeet * checkItem.costRange.high)
                } : null,
                reason: checkItem.reason,
                notes: checkItem.notes
            });
        }
    });

    // Sort by importance
    const importanceOrder = { critical: 0, recommended: 1, optional: 2 };
    missingItems.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

    // Calculate summary statistics
    const criticalCount = missingItems.filter(i => i.importance === 'critical').length;
    const totalEstimatedMissing = missingItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

    return {
        items: missingItems,
        summary: {
            totalMissing: missingItems.length,
            criticalMissing: criticalCount,
            recommendedMissing: missingItems.filter(i => i.importance === 'recommended').length,
            optionalMissing: missingItems.filter(i => i.importance === 'optional').length,
            estimatedMissingCost: totalEstimatedMissing
        },
        alert: criticalCount > 0
            ? `WARNING: ${criticalCount} critical items may be missing from your bid!`
            : missingItems.length > 3
                ? `Note: ${missingItems.length} items may be missing - please review`
                : null
    };
}

function getChecklistForProjectType(projectType) {
    // Base items for all concrete projects
    const baseItems = [
        {
            name: 'Mobilization/Setup',
            keywords: ['mobilization', 'mob', 'setup', 'set up', 'equipment transport'],
            category: 'General Conditions',
            importance: 'critical',
            costRange: { low: 0.25, high: 0.75 },
            reason: 'Equipment and crew transportation to site',
            notes: 'Typically 2-5% of project cost'
        },
        {
            name: 'Permits & Inspections',
            keywords: ['permit', 'permits', 'inspection', 'inspections', 'building permit'],
            category: 'General Conditions',
            importance: 'critical',
            costRange: { low: 0.10, high: 0.30 },
            reason: 'Required permits and inspection fees',
            notes: 'Check local requirements - can vary significantly'
        },
        {
            name: 'Site Prep/Grading',
            keywords: ['site prep', 'grading', 'excavation', 'grade', 'dig', 'excavate', 'demo'],
            category: 'Site Work',
            importance: 'critical',
            costRange: { low: 0.50, high: 2.00 },
            reason: 'Prepare and level the work area',
            notes: 'Varies greatly with existing conditions'
        },
        {
            name: 'Base Material/Gravel',
            keywords: ['base', 'gravel', 'aggregate', 'sub-base', 'subbase', 'abc stone'],
            category: 'Site Work',
            importance: 'recommended',
            costRange: { low: 0.35, high: 0.80 },
            reason: 'Compacted base for concrete support',
            notes: 'Typically 4-6" compacted gravel base'
        },
        {
            name: 'Forms',
            keywords: ['form', 'forms', 'forming', 'formwork', 'edge form'],
            category: 'Concrete Work',
            importance: 'critical',
            costRange: { low: 0.30, high: 0.75 },
            reason: 'Contain concrete during pour',
            notes: 'Include setup and removal labor'
        },
        {
            name: 'Reinforcement (Rebar/Mesh)',
            keywords: ['rebar', 'reinforcement', 'mesh', 'wire mesh', 'steel', 'fiber'],
            category: 'Concrete Work',
            importance: 'critical',
            costRange: { low: 0.40, high: 1.20 },
            reason: 'Structural reinforcement for concrete',
            notes: 'Rebar for structural, mesh for slabs'
        },
        {
            name: 'Concrete Material',
            keywords: ['concrete', 'cement', 'ready mix', 'readymix', 'mud'],
            category: 'Concrete Work',
            importance: 'critical',
            costRange: { low: 2.50, high: 4.50 },
            reason: 'Primary material cost',
            notes: 'Verify PSI requirements and pump needs'
        },
        {
            name: 'Concrete Pump/Placement',
            keywords: ['pump', 'pumping', 'placement', 'boom pump', 'line pump'],
            category: 'Concrete Work',
            importance: 'recommended',
            costRange: { low: 0.20, high: 0.60 },
            reason: 'May be needed for site access or large pours',
            notes: 'Required if mixer trucks cannot reach pour site'
        },
        {
            name: 'Finishing Labor',
            keywords: ['finish', 'finishing', 'trowel', 'float', 'broom', 'labor'],
            category: 'Concrete Work',
            importance: 'critical',
            costRange: { low: 1.00, high: 3.00 },
            reason: 'Labor for screeding, floating, and finishing',
            notes: 'Decorative finishes cost significantly more'
        },
        {
            name: 'Control Joints/Saw Cutting',
            keywords: ['joint', 'joints', 'control joint', 'saw cut', 'sawcut', 'cutting'],
            category: 'Concrete Work',
            importance: 'recommended',
            costRange: { low: 0.15, high: 0.40 },
            reason: 'Prevent random cracking',
            notes: 'Joints typically every 8-12 feet'
        },
        {
            name: 'Curing Compound/Protection',
            keywords: ['cure', 'curing', 'sealer', 'sealant', 'protection', 'blanket'],
            category: 'Concrete Work',
            importance: 'recommended',
            costRange: { low: 0.10, high: 0.30 },
            reason: 'Proper curing for strength development',
            notes: 'Critical for quality concrete'
        },
        {
            name: 'Cleanup & Disposal',
            keywords: ['cleanup', 'clean up', 'disposal', 'haul', 'dump', 'waste'],
            category: 'General Conditions',
            importance: 'recommended',
            costRange: { low: 0.15, high: 0.40 },
            reason: 'Job site cleanup and waste removal',
            notes: 'Include both daily and final cleanup'
        },
        {
            name: 'Warranty',
            keywords: ['warranty', 'guarantee', 'workmanship'],
            category: 'General Conditions',
            importance: 'optional',
            costRange: null,
            reason: 'Workmanship warranty coverage',
            notes: 'Standard is 1 year workmanship'
        }
    ];

    // Project-type specific items
    const typeSpecificItems = {
        stamped: [
            {
                name: 'Stamping Tools/Materials',
                keywords: ['stamp', 'stamping', 'pattern', 'texture'],
                category: 'Decorative',
                importance: 'critical',
                costRange: { low: 1.50, high: 4.00 },
                reason: 'Decorative stamping materials and labor'
            },
            {
                name: 'Color Hardener/Release',
                keywords: ['color', 'hardener', 'release', 'integral color', 'stain'],
                category: 'Decorative',
                importance: 'critical',
                costRange: { low: 0.80, high: 2.00 },
                reason: 'Coloring materials for stamped concrete'
            },
            {
                name: 'Antiquing/Accent Color',
                keywords: ['antique', 'antiquing', 'accent', 'highlight'],
                category: 'Decorative',
                importance: 'recommended',
                costRange: { low: 0.40, high: 1.00 },
                reason: 'Accent coloring for depth and detail'
            },
            {
                name: 'Sealer (Decorative)',
                keywords: ['sealer', 'seal', 'topcoat', 'finish coat'],
                category: 'Decorative',
                importance: 'critical',
                costRange: { low: 0.50, high: 1.20 },
                reason: 'Protective sealer for decorative finish'
            }
        ],
        decorative: [
            {
                name: 'Decorative Finish Materials',
                keywords: ['decorative', 'finish', 'exposed', 'aggregate'],
                category: 'Decorative',
                importance: 'critical',
                costRange: { low: 1.00, high: 3.00 },
                reason: 'Special finish materials and labor'
            },
            {
                name: 'Sealer (Decorative)',
                keywords: ['sealer', 'seal', 'topcoat'],
                category: 'Decorative',
                importance: 'critical',
                costRange: { low: 0.50, high: 1.20 },
                reason: 'Protective sealer for decorative finish'
            }
        ],
        foundation: [
            {
                name: 'Footing/Foundation Forms',
                keywords: ['footing', 'foundation form', 'wall form'],
                category: 'Foundation',
                importance: 'critical',
                costRange: { low: 0.75, high: 2.00 },
                reason: 'Structural foundation forming'
            },
            {
                name: 'Engineering/Survey',
                keywords: ['engineering', 'survey', 'layout', 'staking'],
                category: 'Foundation',
                importance: 'critical',
                costRange: { low: 0.20, high: 0.50 },
                reason: 'Professional layout and verification'
            },
            {
                name: 'Anchor Bolts/Embedments',
                keywords: ['anchor', 'bolt', 'embed', 'holdown', 'hold down'],
                category: 'Foundation',
                importance: 'critical',
                costRange: { low: 0.15, high: 0.40 },
                reason: 'Connection hardware for structure'
            },
            {
                name: 'Waterproofing',
                keywords: ['waterproof', 'dampproof', 'membrane', 'coating'],
                category: 'Foundation',
                importance: 'recommended',
                costRange: { low: 0.30, high: 0.80 },
                reason: 'Foundation moisture protection'
            }
        ],
        driveway: [
            {
                name: 'Expansion Joint Material',
                keywords: ['expansion', 'isolation', 'joint filler'],
                category: 'Joints',
                importance: 'critical',
                costRange: { low: 0.10, high: 0.25 },
                reason: 'Separation from existing structures'
            },
            {
                name: 'Apron/Approach Transition',
                keywords: ['apron', 'approach', 'transition', 'street'],
                category: 'Site Work',
                importance: 'recommended',
                costRange: { low: 0.20, high: 0.50 },
                reason: 'Smooth transition to street/existing surfaces'
            }
        ],
        commercial: [
            {
                name: 'Testing/QC',
                keywords: ['test', 'testing', 'qc', 'quality control', 'cylinder', 'slump'],
                category: 'Quality',
                importance: 'critical',
                costRange: { low: 0.15, high: 0.35 },
                reason: 'Required quality control testing'
            },
            {
                name: 'Traffic Control',
                keywords: ['traffic', 'barricade', 'safety', 'cones'],
                category: 'General Conditions',
                importance: 'recommended',
                costRange: { low: 0.10, high: 0.30 },
                reason: 'Site safety and traffic management'
            },
            {
                name: 'Bonding/Insurance Certificate',
                keywords: ['bond', 'insurance', 'certificate', 'coi'],
                category: 'General Conditions',
                importance: 'recommended',
                costRange: null,
                reason: 'May be required for commercial work'
            }
        ],
        pool_deck: [
            {
                name: 'Non-Slip Finish',
                keywords: ['non-slip', 'nonslip', 'slip resistant', 'safety', 'broom'],
                category: 'Safety',
                importance: 'critical',
                costRange: { low: 0.20, high: 0.50 },
                reason: 'Safety requirement for pool areas'
            },
            {
                name: 'Coping/Edge Treatment',
                keywords: ['coping', 'edge', 'bull nose', 'bullnose'],
                category: 'Pool',
                importance: 'critical',
                costRange: { low: 0.40, high: 1.00 },
                reason: 'Pool edge finishing'
            },
            {
                name: 'Drainage/Slope',
                keywords: ['drain', 'drainage', 'slope', 'pitch'],
                category: 'Site Work',
                importance: 'critical',
                costRange: { low: 0.15, high: 0.35 },
                reason: 'Proper water drainage away from pool'
            }
        ]
    };

    // Combine base items with type-specific items
    let items = [...baseItems];

    if (typeSpecificItems[projectType]) {
        items = items.concat(typeSpecificItems[projectType]);
    }

    return items;
}

function calculateItemEstimate(checkItem, squareFeet, projectType) {
    if (!checkItem.costRange || squareFeet <= 0) {
        return null;
    }

    // Use midpoint of cost range
    const midRate = (checkItem.costRange.low + checkItem.costRange.high) / 2;
    return Math.round(squareFeet * midRate);
}

// =============================================================================
// SANITY CHECKS
// =============================================================================

/**
 * Run sanity checks on a bid
 * @param {Object} bid - Bid data
 * @returns {Array} List of check results
 */
function runSanityChecks(bid) {
    const checks = [];

    const totalPrice = bid.totalPrice || bid.total || bid.price || 0;
    const squareFeet = bid.squareFeet || bid.totalSF || bid.sf || 0;
    const projectType = BidUtils.normalizeProjectType(bid.projectType || bid.type || 'basic_slab');
    const lineItems = bid.lineItems || bid.items || [];

    // 1. Check Price per SF
    checks.push(checkPricePerSF(totalPrice, squareFeet, projectType));

    // 2. Check Labor to Material Ratio
    checks.push(checkLaborMaterialRatio(lineItems, totalPrice));

    // 3. Check Concrete Quantity
    checks.push(checkConcreteQuantity(bid, squareFeet));

    // 4. Check Overhead & Profit
    checks.push(checkOverheadProfit(bid, totalPrice));

    // 5. Check Minimum Project Values
    checks.push(checkMinimumValues(totalPrice, squareFeet));

    // 6. Check for Round Number Estimates
    checks.push(checkRoundNumbers(lineItems));

    // 7. Check Unit Prices Against Market
    checks.push(checkUnitPrices(lineItems, projectType));

    // 8. Check Total Math
    checks.push(checkMathAccuracy(bid, totalPrice));

    // Generate summary
    const passCount = checks.filter(c => c.status === 'pass').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    return {
        checks: checks,
        summary: {
            total: checks.length,
            passed: passCount,
            warnings: warningCount,
            failed: failCount,
            score: Math.round((passCount / checks.length) * 100)
        },
        overallStatus: failCount > 0 ? 'fail' : warningCount > 2 ? 'warning' : 'pass',
        message: failCount > 0
            ? `${failCount} critical issue(s) found - review before submitting`
            : warningCount > 0
                ? `${warningCount} warning(s) - consider reviewing`
                : 'All checks passed'
    };
}

function checkPricePerSF(totalPrice, squareFeet, projectType) {
    const check = {
        name: 'Price per Square Foot',
        category: 'Pricing'
    };

    if (squareFeet <= 0) {
        return { ...check, status: 'warning', message: 'Square footage not specified - cannot verify pricing' };
    }

    const pricePerSF = totalPrice / squareFeet;
    const range = BidUtils.getPriceRange(projectType);

    if (pricePerSF < range.low * 0.7) {
        return {
            ...check,
            status: 'fail',
            message: `$${pricePerSF.toFixed(2)}/SF is significantly below market ($${range.low}-$${range.high}). You may be missing costs or underpricing.`,
            value: pricePerSF,
            expected: `$${range.low} - $${range.high}`
        };
    } else if (pricePerSF < range.low) {
        return {
            ...check,
            status: 'warning',
            message: `$${pricePerSF.toFixed(2)}/SF is below typical market range ($${range.low}-$${range.high}).`,
            value: pricePerSF,
            expected: `$${range.low} - $${range.high}`
        };
    } else if (pricePerSF > range.high * 1.3) {
        return {
            ...check,
            status: 'fail',
            message: `$${pricePerSF.toFixed(2)}/SF is significantly above market ($${range.low}-$${range.high}). Very unlikely to win without special circumstances.`,
            value: pricePerSF,
            expected: `$${range.low} - $${range.high}`
        };
    } else if (pricePerSF > range.high) {
        return {
            ...check,
            status: 'warning',
            message: `$${pricePerSF.toFixed(2)}/SF is above typical market range ($${range.low}-$${range.high}).`,
            value: pricePerSF,
            expected: `$${range.low} - $${range.high}`
        };
    }

    return {
        ...check,
        status: 'pass',
        message: `$${pricePerSF.toFixed(2)}/SF is within market range ($${range.low}-$${range.high})`,
        value: pricePerSF,
        expected: `$${range.low} - $${range.high}`
    };
}

function checkLaborMaterialRatio(lineItems, totalPrice) {
    const check = {
        name: 'Labor to Material Ratio',
        category: 'Cost Structure'
    };

    let laborTotal = 0;
    let materialTotal = 0;

    lineItems.forEach(item => {
        const name = (item.name || item.description || '').toLowerCase();
        const cost = item.total || item.cost || item.amount || 0;

        // Categorize items
        if (name.includes('labor') || name.includes('finish') || name.includes('install') ||
            name.includes('pour') || name.includes('form') || name.includes('setup')) {
            laborTotal += cost;
        } else if (name.includes('concrete') || name.includes('material') || name.includes('gravel') ||
                   name.includes('rebar') || name.includes('mesh') || name.includes('base')) {
            materialTotal += cost;
        }
    });

    // If we couldn't categorize, try to estimate from total
    if (laborTotal === 0 && materialTotal === 0) {
        return {
            ...check,
            status: 'warning',
            message: 'Cannot determine labor/material breakdown - line items need clearer categorization',
            value: null,
            expected: '30-50% labor'
        };
    }

    const directCosts = laborTotal + materialTotal;
    if (directCosts === 0) {
        return { ...check, status: 'warning', message: 'No labor or material costs identified' };
    }

    const laborRatio = laborTotal / directCosts;

    if (laborRatio < BidConfig.laborMaterialRatio.min) {
        return {
            ...check,
            status: 'warning',
            message: `Labor ratio (${(laborRatio * 100).toFixed(1)}%) is low. Verify labor costs are complete.`,
            value: laborRatio,
            expected: '30-50%'
        };
    } else if (laborRatio > BidConfig.laborMaterialRatio.max) {
        return {
            ...check,
            status: 'warning',
            message: `Labor ratio (${(laborRatio * 100).toFixed(1)}%) is high. Verify material costs are complete.`,
            value: laborRatio,
            expected: '30-50%'
        };
    }

    return {
        ...check,
        status: 'pass',
        message: `Labor ratio (${(laborRatio * 100).toFixed(1)}%) is within normal range`,
        value: laborRatio,
        expected: '30-50%'
    };
}

function checkConcreteQuantity(bid, squareFeet) {
    const check = {
        name: 'Concrete Quantity',
        category: 'Materials'
    };

    const thickness = bid.thickness || bid.thicknessInches || 4;
    const concreteYards = bid.concreteYards || bid.yards || bid.cy || 0;

    if (concreteYards <= 0) {
        return {
            ...check,
            status: 'warning',
            message: 'Concrete quantity not specified - cannot verify'
        };
    }

    if (squareFeet <= 0) {
        return {
            ...check,
            status: 'warning',
            message: 'Square footage not specified - cannot verify concrete quantity'
        };
    }

    const expectedYards = BidUtils.calculateExpectedConcreteYards(squareFeet, thickness);
    const variance = (concreteYards - expectedYards) / expectedYards;

    // Include typical waste factor of 5-10%
    const expectedWithWaste = expectedYards * 1.07;

    if (concreteYards < expectedYards * 0.85) {
        return {
            ...check,
            status: 'fail',
            message: `${concreteYards} CY seems low for ${squareFeet} SF at ${thickness}". Expected ~${expectedWithWaste.toFixed(1)} CY (including waste).`,
            value: concreteYards,
            expected: expectedWithWaste.toFixed(1)
        };
    } else if (concreteYards > expectedYards * 1.25) {
        return {
            ...check,
            status: 'warning',
            message: `${concreteYards} CY seems high for ${squareFeet} SF at ${thickness}". Expected ~${expectedWithWaste.toFixed(1)} CY.`,
            value: concreteYards,
            expected: expectedWithWaste.toFixed(1)
        };
    }

    return {
        ...check,
        status: 'pass',
        message: `Concrete quantity (${concreteYards} CY) is appropriate for ${squareFeet} SF at ${thickness}"`,
        value: concreteYards,
        expected: expectedWithWaste.toFixed(1)
    };
}

function checkOverheadProfit(bid, totalPrice) {
    const check = {
        name: 'Overhead & Profit',
        category: 'Margins'
    };

    const overhead = bid.overhead || bid.overheadAmount || 0;
    const profit = bid.profit || bid.profitAmount || 0;
    const overheadPercent = bid.overheadPercent || (totalPrice > 0 ? overhead / totalPrice : 0);
    const profitPercent = bid.profitPercent || (totalPrice > 0 ? profit / totalPrice : 0);

    if (overheadPercent === 0 && profitPercent === 0) {
        // Try to calculate from direct costs vs total
        const directCosts = bid.directCosts || bid.subtotal || 0;
        if (directCosts > 0 && totalPrice > directCosts) {
            const markupPercent = (totalPrice - directCosts) / totalPrice;

            if (markupPercent < 0.15) {
                return {
                    ...check,
                    status: 'warning',
                    message: `Total markup appears to be only ${(markupPercent * 100).toFixed(1)}%. Standard is 20-35% for overhead + profit.`,
                    value: markupPercent,
                    expected: '20-35%'
                };
            } else if (markupPercent > 0.45) {
                return {
                    ...check,
                    status: 'warning',
                    message: `Total markup is ${(markupPercent * 100).toFixed(1)}%. May be high unless project has special circumstances.`,
                    value: markupPercent,
                    expected: '20-35%'
                };
            }

            return {
                ...check,
                status: 'pass',
                message: `Markup (${(markupPercent * 100).toFixed(1)}%) is within typical range`,
                value: markupPercent,
                expected: '20-35%'
            };
        }

        return {
            ...check,
            status: 'warning',
            message: 'Overhead and profit not specified - cannot verify margins'
        };
    }

    const issues = [];

    if (overheadPercent < BidConfig.overheadRange.min) {
        issues.push(`Overhead (${(overheadPercent * 100).toFixed(1)}%) may be too low`);
    } else if (overheadPercent > BidConfig.overheadRange.max) {
        issues.push(`Overhead (${(overheadPercent * 100).toFixed(1)}%) is high`);
    }

    if (profitPercent < BidConfig.profitRange.min) {
        issues.push(`Profit (${(profitPercent * 100).toFixed(1)}%) may be too low`);
    } else if (profitPercent > BidConfig.profitRange.max) {
        issues.push(`Profit (${(profitPercent * 100).toFixed(1)}%) is high`);
    }

    if (issues.length > 0) {
        return {
            ...check,
            status: 'warning',
            message: issues.join('. '),
            value: { overhead: overheadPercent, profit: profitPercent },
            expected: 'Overhead: 8-18%, Profit: 8-25%'
        };
    }

    return {
        ...check,
        status: 'pass',
        message: `Overhead (${(overheadPercent * 100).toFixed(1)}%) and Profit (${(profitPercent * 100).toFixed(1)}%) are reasonable`,
        value: { overhead: overheadPercent, profit: profitPercent },
        expected: 'Overhead: 8-18%, Profit: 8-25%'
    };
}

function checkMinimumValues(totalPrice, squareFeet) {
    const check = {
        name: 'Minimum Project Values',
        category: 'Viability'
    };

    // Minimum job thresholds (adjust based on your business)
    const minimumJobPrice = 1500;
    const minimumSF = 50;

    if (totalPrice < minimumJobPrice && squareFeet > minimumSF) {
        return {
            ...check,
            status: 'warning',
            message: `Total price ($${totalPrice.toLocaleString()}) may be below minimum viable job cost. Consider minimum charges.`,
            value: totalPrice,
            expected: `>$${minimumJobPrice}`
        };
    }

    if (squareFeet > 0 && squareFeet < minimumSF) {
        return {
            ...check,
            status: 'warning',
            message: `Very small project (${squareFeet} SF). Ensure minimum job pricing applies.`,
            value: squareFeet,
            expected: `>${minimumSF} SF`
        };
    }

    return {
        ...check,
        status: 'pass',
        message: 'Project size and price meet minimum thresholds'
    };
}

function checkRoundNumbers(lineItems) {
    const check = {
        name: 'Estimate Precision',
        category: 'Quality'
    };

    if (lineItems.length === 0) {
        return { ...check, status: 'warning', message: 'No line items to check' };
    }

    let roundCount = 0;
    let suspiciousItems = [];

    lineItems.forEach(item => {
        const cost = item.total || item.cost || item.amount || 0;
        // Check for round numbers (divisible by 100 with no cents)
        if (cost >= 100 && cost % 100 === 0) {
            roundCount++;
            if (cost % 500 === 0 && cost > 500) {
                suspiciousItems.push(item.name || item.description || 'Unknown item');
            }
        }
    });

    const roundPercent = roundCount / lineItems.length;

    if (roundPercent > 0.7 && lineItems.length > 3) {
        return {
            ...check,
            status: 'warning',
            message: `${(roundPercent * 100).toFixed(0)}% of line items are round numbers. Consider more precise estimates.`,
            value: roundPercent,
            suspiciousItems: suspiciousItems.slice(0, 3)
        };
    }

    return {
        ...check,
        status: 'pass',
        message: 'Estimate precision appears reasonable'
    };
}

function checkUnitPrices(lineItems, projectType) {
    const check = {
        name: 'Unit Price Verification',
        category: 'Pricing'
    };

    // Standard unit price ranges
    const unitPriceRanges = {
        concrete: { unit: 'CY', low: 120, high: 180, name: 'Concrete' },
        rebar: { unit: 'LB', low: 0.60, high: 1.20, name: 'Rebar' },
        gravel: { unit: 'TON', low: 25, high: 50, name: 'Gravel' },
        labor: { unit: 'HR', low: 45, high: 85, name: 'Labor' },
        forms: { unit: 'LF', low: 2.50, high: 6.00, name: 'Forms' }
    };

    const issues = [];

    lineItems.forEach(item => {
        const name = (item.name || item.description || '').toLowerCase();
        const unitPrice = item.unitPrice || item.rate || 0;
        const unit = (item.unit || '').toUpperCase();

        Object.entries(unitPriceRanges).forEach(([key, range]) => {
            if (name.includes(key) && unit === range.unit && unitPrice > 0) {
                if (unitPrice < range.low * 0.7) {
                    issues.push(`${range.name} unit price ($${unitPrice}/${unit}) seems low (typical: $${range.low}-$${range.high})`);
                } else if (unitPrice > range.high * 1.3) {
                    issues.push(`${range.name} unit price ($${unitPrice}/${unit}) seems high (typical: $${range.low}-$${range.high})`);
                }
            }
        });
    });

    if (issues.length > 0) {
        return {
            ...check,
            status: 'warning',
            message: issues.join('. '),
            issues: issues
        };
    }

    return {
        ...check,
        status: 'pass',
        message: 'Unit prices appear reasonable'
    };
}

function checkMathAccuracy(bid, totalPrice) {
    const check = {
        name: 'Math Verification',
        category: 'Accuracy'
    };

    const lineItems = bid.lineItems || bid.items || [];

    if (lineItems.length === 0) {
        return { ...check, status: 'pass', message: 'No line items to verify' };
    }

    // Sum line items
    const lineItemSum = lineItems.reduce((sum, item) => {
        return sum + (item.total || item.cost || item.amount || 0);
    }, 0);

    // Account for overhead and profit
    const overhead = bid.overheadAmount || bid.overhead || 0;
    const profit = bid.profitAmount || bid.profit || 0;
    const tax = bid.tax || bid.salesTax || 0;

    const calculatedTotal = lineItemSum + overhead + profit + tax;

    // Allow small rounding differences
    const difference = Math.abs(totalPrice - calculatedTotal);
    const percentDiff = totalPrice > 0 ? (difference / totalPrice) * 100 : 0;

    if (percentDiff > 1 && difference > 10) {
        return {
            ...check,
            status: 'fail',
            message: `Total ($${totalPrice.toLocaleString()}) doesn't match line items + overhead/profit ($${calculatedTotal.toLocaleString()}). Difference: $${difference.toFixed(2)}`,
            value: { stated: totalPrice, calculated: calculatedTotal, difference: difference }
        };
    } else if (percentDiff > 0.5 && difference > 5) {
        return {
            ...check,
            status: 'warning',
            message: `Minor discrepancy: Total ($${totalPrice.toLocaleString()}) vs calculated ($${calculatedTotal.toLocaleString()})`,
            value: { stated: totalPrice, calculated: calculatedTotal, difference: difference }
        };
    }

    return {
        ...check,
        status: 'pass',
        message: 'Math verification passed'
    };
}

// =============================================================================
// MARGIN OPTIMIZER
// =============================================================================

/**
 * Optimize bid margin to balance profit and win probability
 * @param {Object} bid - Current bid data
 * @param {Array} history - Historical bid data
 * @returns {Object} Margin optimization recommendations
 */
function optimizeMargin(bid, history = []) {
    const totalPrice = bid.totalPrice || bid.total || bid.price || 0;
    const directCosts = bid.directCosts || bid.subtotal || calculateDirectCosts(bid);
    const squareFeet = bid.squareFeet || bid.totalSF || bid.sf || 0;
    const projectType = bid.projectType || bid.type || 'basic_slab';

    if (directCosts <= 0 || totalPrice <= 0) {
        return {
            error: 'Unable to calculate margins - missing cost data',
            currentMargin: null,
            recommendation: 'Ensure direct costs and total price are specified'
        };
    }

    // Calculate current margin
    const currentMargin = (totalPrice - directCosts) / totalPrice;
    const currentMarkup = (totalPrice - directCosts) / directCosts;

    // Get pricing analysis for context
    const pricing = analyzePricing(bid, history);

    // Calculate optimal scenarios
    const scenarios = [];

    // Generate scenarios at different price points
    const pricePoints = [0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15].map(factor => {
        const scenarioPrice = Math.round(totalPrice * factor);
        const scenarioMargin = (scenarioPrice - directCosts) / scenarioPrice;
        const scenarioPricePerSF = squareFeet > 0 ? scenarioPrice / squareFeet : 0;

        // Estimate win probability for this price
        const winProb = calculateWinProbability(
            scenarioPricePerSF,
            pricing.winningAverage || pricing.marketMid,
            pricing.losingAverage || pricing.marketHigh,
            BidUtils.getPriceRange(projectType)
        );

        // Calculate expected profit (margin * win probability)
        const expectedProfit = (scenarioPrice - directCosts) * winProb;

        return {
            price: scenarioPrice,
            pricePerSF: scenarioPricePerSF,
            margin: scenarioMargin,
            markup: (scenarioPrice - directCosts) / directCosts,
            winProbability: winProb,
            expectedProfit: expectedProfit,
            profitIfWin: scenarioPrice - directCosts
        };
    });

    // Find optimal scenario (highest expected profit)
    const optimal = scenarios.length > 0
        ? pricePoints.reduce((best, current) =>
            current.expectedProfit > best.expectedProfit ? current : best
          )
        : pricePoints.find(s => s.price === totalPrice);

    // Find current scenario for comparison
    const current = pricePoints.find(s => s.price === totalPrice) || {
        price: totalPrice,
        pricePerSF: squareFeet > 0 ? totalPrice / squareFeet : 0,
        margin: currentMargin,
        markup: currentMarkup,
        winProbability: pricing.winProbability / 100,
        expectedProfit: (totalPrice - directCosts) * (pricing.winProbability / 100),
        profitIfWin: totalPrice - directCosts
    };

    // Generate recommendation
    let recommendation;
    const marginDiff = optimal.margin - current.margin;

    if (Math.abs(marginDiff) < 0.02) {
        recommendation = {
            action: 'maintain',
            message: 'Current pricing is near optimal for expected profit',
            confidence: 'high'
        };
    } else if (optimal.price < current.price) {
        recommendation = {
            action: 'reduce',
            message: `Consider reducing price by ${BidUtils.formatCurrency(current.price - optimal.price)} to improve win probability`,
            suggestedPrice: optimal.price,
            expectedGain: optimal.expectedProfit - current.expectedProfit,
            confidence: optimal.winProbability > 0.5 ? 'high' : 'medium'
        };
    } else {
        recommendation = {
            action: 'increase',
            message: `You may have room to increase price by ${BidUtils.formatCurrency(optimal.price - current.price)} while maintaining competitiveness`,
            suggestedPrice: optimal.price,
            expectedGain: optimal.expectedProfit - current.expectedProfit,
            confidence: current.winProbability > 0.6 ? 'high' : 'medium'
        };
    }

    return {
        current: {
            price: current.price,
            pricePerSF: Math.round(current.pricePerSF * 100) / 100,
            margin: Math.round(current.margin * 1000) / 10,
            markup: Math.round(current.markup * 1000) / 10,
            winProbability: Math.round(current.winProbability * 1000) / 10,
            expectedProfit: Math.round(current.expectedProfit),
            profitIfWin: Math.round(current.profitIfWin)
        },
        optimal: {
            price: optimal.price,
            pricePerSF: Math.round(optimal.pricePerSF * 100) / 100,
            margin: Math.round(optimal.margin * 1000) / 10,
            markup: Math.round(optimal.markup * 1000) / 10,
            winProbability: Math.round(optimal.winProbability * 1000) / 10,
            expectedProfit: Math.round(optimal.expectedProfit),
            profitIfWin: Math.round(optimal.profitIfWin)
        },
        scenarios: pricePoints.map(s => ({
            price: s.price,
            margin: Math.round(s.margin * 1000) / 10,
            winProbability: Math.round(s.winProbability * 1000) / 10,
            expectedProfit: Math.round(s.expectedProfit)
        })),
        recommendation: recommendation,
        directCosts: directCosts
    };
}

function calculateDirectCosts(bid) {
    const lineItems = bid.lineItems || bid.items || [];

    // Sum line items excluding overhead/profit
    return lineItems.reduce((sum, item) => {
        const name = (item.name || item.description || '').toLowerCase();
        // Exclude overhead and profit items
        if (name.includes('overhead') || name.includes('profit') || name.includes('markup')) {
            return sum;
        }
        return sum + (item.total || item.cost || item.amount || 0);
    }, 0);
}

// =============================================================================
// COMPETITOR TRACKER
// =============================================================================

/**
 * Competitor tracking and analysis module
 */
const CompetitorTracker = {
    // Storage key for localStorage
    STORAGE_KEY: 'donsmith_competitor_data',

    /**
     * Get competitor data from storage
     */
    getData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : { competitors: {}, projects: [] };
        } catch (e) {
            console.error('Error loading competitor data:', e);
            return { competitors: {}, projects: [] };
        }
    },

    /**
     * Save competitor data to storage
     */
    saveData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving competitor data:', e);
        }
    },

    /**
     * Log a competitor bid
     * @param {string} projectId - Project identifier
     * @param {string} competitorName - Name of competitor
     * @param {number} price - Competitor's bid price
     * @param {boolean} won - Whether competitor won the bid
     * @param {Object} details - Additional details
     */
    logCompetitor(projectId, competitorName, price, won = null, details = {}) {
        const data = this.getData();
        const normalizedName = competitorName.toLowerCase().trim();

        // Initialize competitor if new
        if (!data.competitors[normalizedName]) {
            data.competitors[normalizedName] = {
                name: competitorName,
                displayName: competitorName,
                bids: [],
                wins: 0,
                losses: 0,
                totalBids: 0
            };
        }

        // Create bid record
        const bidRecord = {
            projectId: projectId,
            price: price,
            won: won,
            date: new Date().toISOString(),
            squareFeet: details.squareFeet || null,
            projectType: details.projectType || null,
            ourPrice: details.ourPrice || null,
            notes: details.notes || null
        };

        // Add to competitor's bids
        data.competitors[normalizedName].bids.push(bidRecord);
        data.competitors[normalizedName].totalBids++;

        if (won === true) {
            data.competitors[normalizedName].wins++;
        } else if (won === false) {
            data.competitors[normalizedName].losses++;
        }

        // Add to project list
        data.projects.push({
            projectId: projectId,
            competitor: normalizedName,
            ...bidRecord
        });

        this.saveData(data);

        return {
            success: true,
            message: `Logged ${competitorName}'s bid on project ${projectId}`,
            competitor: data.competitors[normalizedName]
        };
    },

    /**
     * Get history for a specific competitor
     * @param {string} competitorName - Name of competitor
     * @returns {Object} Competitor history and statistics
     */
    getCompetitorHistory(competitorName = null) {
        const data = this.getData();

        if (competitorName) {
            const normalizedName = competitorName.toLowerCase().trim();
            const competitor = data.competitors[normalizedName];

            if (!competitor) {
                return { found: false, message: 'Competitor not found' };
            }

            return {
                found: true,
                ...competitor,
                stats: this.calculateCompetitorStats(competitor)
            };
        }

        // Return all competitors
        return Object.values(data.competitors).map(comp => ({
            ...comp,
            stats: this.calculateCompetitorStats(comp)
        }));
    },

    /**
     * Calculate statistics for a competitor
     */
    calculateCompetitorStats(competitor) {
        const bids = competitor.bids || [];

        if (bids.length === 0) {
            return null;
        }

        const prices = bids.map(b => b.price).filter(p => p > 0);
        const pricesPerSF = bids
            .filter(b => b.price > 0 && b.squareFeet > 0)
            .map(b => b.price / b.squareFeet);

        // Calculate spreads (difference from our price)
        const spreads = bids
            .filter(b => b.price > 0 && b.ourPrice > 0)
            .map(b => ((b.price - b.ourPrice) / b.ourPrice) * 100);

        return {
            totalBids: bids.length,
            winRate: competitor.wins / Math.max(competitor.wins + competitor.losses, 1),
            averagePrice: prices.length > 0
                ? prices.reduce((a, b) => a + b, 0) / prices.length
                : null,
            averagePricePerSF: pricesPerSF.length > 0
                ? pricesPerSF.reduce((a, b) => a + b, 0) / pricesPerSF.length
                : null,
            averageSpread: spreads.length > 0
                ? spreads.reduce((a, b) => a + b, 0) / spreads.length
                : null,
            spreadStdDev: spreads.length > 1
                ? BidUtils.standardDeviation(spreads)
                : null,
            lowestPricePerSF: pricesPerSF.length > 0 ? Math.min(...pricesPerSF) : null,
            highestPricePerSF: pricesPerSF.length > 0 ? Math.max(...pricesPerSF) : null,
            recentBids: bids.slice(-5).reverse()
        };
    },

    /**
     * Get overall market spread analysis
     * @returns {Object} Market spread statistics
     */
    getAverageSpread() {
        const data = this.getData();
        const allBids = data.projects || [];

        if (allBids.length === 0) {
            return {
                hasData: false,
                message: 'No competitor data available yet'
            };
        }

        // Calculate spreads for all bids with our price
        const bidsWithOurPrice = allBids.filter(b => b.price > 0 && b.ourPrice > 0);

        if (bidsWithOurPrice.length === 0) {
            return {
                hasData: false,
                message: 'No comparison data available (need both competitor and our prices)'
            };
        }

        const spreads = bidsWithOurPrice.map(b => ((b.price - b.ourPrice) / b.ourPrice) * 100);
        const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;

        // Analyze wins vs losses
        const competitorWins = bidsWithOurPrice.filter(b => b.won === true);
        const competitorLosses = bidsWithOurPrice.filter(b => b.won === false);

        let winningSpread = null;
        let losingSpread = null;

        if (competitorWins.length > 0) {
            const winSpreads = competitorWins.map(b => ((b.price - b.ourPrice) / b.ourPrice) * 100);
            winningSpread = winSpreads.reduce((a, b) => a + b, 0) / winSpreads.length;
        }

        if (competitorLosses.length > 0) {
            const lossSpreads = competitorLosses.map(b => ((b.price - b.ourPrice) / b.ourPrice) * 100);
            losingSpread = lossSpreads.reduce((a, b) => a + b, 0) / lossSpreads.length;
        }

        return {
            hasData: true,
            totalComparisons: bidsWithOurPrice.length,
            averageSpread: Math.round(avgSpread * 10) / 10,
            spreadStdDev: Math.round(BidUtils.standardDeviation(spreads) * 10) / 10,
            minSpread: Math.round(Math.min(...spreads) * 10) / 10,
            maxSpread: Math.round(Math.max(...spreads) * 10) / 10,
            competitorWinRate: competitorWins.length / bidsWithOurPrice.length,
            avgSpreadWhenCompetitorWon: winningSpread !== null
                ? Math.round(winningSpread * 10) / 10
                : null,
            avgSpreadWhenCompetitorLost: losingSpread !== null
                ? Math.round(losingSpread * 10) / 10
                : null,
            insights: generateSpreadInsights(avgSpread, winningSpread, losingSpread)
        };
    },

    /**
     * Get ranked list of competitors
     * @param {string} sortBy - Sort criteria: 'wins', 'bids', 'spread', 'threat'
     */
    getCompetitorRankings(sortBy = 'threat') {
        const competitors = this.getCompetitorHistory();

        if (!Array.isArray(competitors) || competitors.length === 0) {
            return [];
        }

        // Calculate threat score (combination of win rate and activity)
        const withThreatScore = competitors.map(comp => {
            const stats = comp.stats || {};
            const winRate = stats.winRate || 0;
            const activity = Math.min(comp.totalBids / 10, 1); // Normalize activity
            const priceCompetitiveness = stats.averageSpread !== null
                ? Math.max(0, 1 - stats.averageSpread / 20) // Lower spread = higher threat
                : 0.5;

            return {
                ...comp,
                threatScore: (winRate * 0.4 + activity * 0.3 + priceCompetitiveness * 0.3) * 100
            };
        });

        // Sort based on criteria
        switch (sortBy) {
            case 'wins':
                return withThreatScore.sort((a, b) => b.wins - a.wins);
            case 'bids':
                return withThreatScore.sort((a, b) => b.totalBids - a.totalBids);
            case 'spread':
                return withThreatScore.sort((a, b) =>
                    (a.stats?.averageSpread || 100) - (b.stats?.averageSpread || 100)
                );
            case 'threat':
            default:
                return withThreatScore.sort((a, b) => b.threatScore - a.threatScore);
        }
    },

    /**
     * Clear all competitor data
     */
    clearData() {
        this.saveData({ competitors: {}, projects: [] });
        return { success: true, message: 'All competitor data cleared' };
    },

    /**
     * Export competitor data
     */
    exportData() {
        return this.getData();
    },

    /**
     * Import competitor data
     */
    importData(data) {
        if (data && data.competitors && data.projects) {
            this.saveData(data);
            return { success: true, message: 'Data imported successfully' };
        }
        return { success: false, message: 'Invalid data format' };
    }
};

function generateSpreadInsights(avgSpread, winningSpread, losingSpread) {
    const insights = [];

    if (avgSpread < -5) {
        insights.push({
            type: 'info',
            message: `On average, competitors bid ${Math.abs(avgSpread).toFixed(1)}% lower than you. Consider reviewing your pricing strategy.`
        });
    } else if (avgSpread > 5) {
        insights.push({
            type: 'success',
            message: `On average, competitors bid ${avgSpread.toFixed(1)}% higher than you. You may have room to increase margins.`
        });
    } else {
        insights.push({
            type: 'info',
            message: 'Your pricing is generally in line with competitors.'
        });
    }

    if (winningSpread !== null && losingSpread !== null) {
        const gap = losingSpread - winningSpread;
        if (gap > 5) {
            insights.push({
                type: 'insight',
                message: `Price sensitivity detected: Competitors win when they're ${Math.abs(winningSpread).toFixed(1)}% below you, lose when ${losingSpread.toFixed(1)}% above.`
            });
        }
    }

    return insights;
}

// =============================================================================
// MAIN AI ANALYZER INTERFACE
// =============================================================================

/**
 * Main AI Analyzer interface for Don Smith Concrete Bid Pro
 */
const AIAnalyzer = {
    /**
     * Run comprehensive analysis on a bid
     * @param {Object} bid - Bid data
     * @param {Array} historicalData - Historical bid data
     * @returns {Object} Complete analysis results
     */
    analyzeEstimate(bid, historicalData = []) {
        const pricing = this.getPricingRecommendation(bid, historicalData);
        const risk = this.getRiskScore(bid);
        const missing = this.findMissingItems(bid);
        const sanity = this.runSanityChecks(bid);
        const margin = this.optimizeMargin(bid, historicalData);

        // Calculate overall score
        const scores = {
            pricing: pricing.winProbability,
            risk: 100 - risk.score,
            completeness: 100 - (missing.summary.criticalMissing * 20) - (missing.summary.recommendedMissing * 5),
            sanity: sanity.summary.score
        };

        const overallScore = Math.round(
            (scores.pricing * 0.3) +
            (scores.risk * 0.2) +
            (scores.completeness * 0.25) +
            (scores.sanity * 0.25)
        );

        return {
            overallScore: BidUtils.clamp(overallScore, 0, 100),
            overallGrade: getGradeFromScore(overallScore),
            pricing: pricing,
            risk: risk,
            missingItems: missing,
            sanityChecks: sanity,
            marginOptimization: margin,
            scores: scores,
            summary: generateAnalysisSummary(pricing, risk, missing, sanity, margin),
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Get pricing analysis and recommendation
     */
    getPricingRecommendation(bid, history = []) {
        return analyzePricing(bid, history);
    },

    /**
     * Get risk score for project
     */
    getRiskScore(project, bid = null) {
        // Merge project and bid data if both provided
        const mergedData = bid ? { ...project, ...bid } : project;
        return calculateRiskScore(mergedData);
    },

    /**
     * Find missing items in bid
     */
    findMissingItems(bid) {
        return detectMissingItems(bid);
    },

    /**
     * Optimize bid margin
     */
    optimizeMargin(bid, history = []) {
        return optimizeMargin(bid, history);
    },

    /**
     * Run sanity checks on bid
     */
    runSanityChecks(bid) {
        return runSanityChecks(bid);
    },

    /**
     * Quick analysis for immediate feedback
     */
    quickCheck(bid) {
        const squareFeet = bid.squareFeet || bid.totalSF || bid.sf || 0;
        const totalPrice = bid.totalPrice || bid.total || bid.price || 0;
        const projectType = bid.projectType || bid.type || 'basic_slab';

        if (squareFeet <= 0 || totalPrice <= 0) {
            return {
                status: 'incomplete',
                message: 'Missing square footage or total price for quick analysis'
            };
        }

        const pricePerSF = totalPrice / squareFeet;
        const range = BidUtils.getPriceRange(projectType);

        let status, message;

        if (pricePerSF < range.low) {
            status = 'low';
            message = `$${pricePerSF.toFixed(2)}/SF is below market. Check for missing costs.`;
        } else if (pricePerSF > range.high) {
            status = 'high';
            message = `$${pricePerSF.toFixed(2)}/SF is above market. May reduce win chances.`;
        } else {
            status = 'good';
            message = `$${pricePerSF.toFixed(2)}/SF is within market range.`;
        }

        return {
            status: status,
            message: message,
            pricePerSF: pricePerSF,
            marketRange: range
        };
    }
};

function getGradeFromScore(score) {
    if (score >= 90) return { grade: 'A', label: 'Excellent' };
    if (score >= 80) return { grade: 'B', label: 'Good' };
    if (score >= 70) return { grade: 'C', label: 'Fair' };
    if (score >= 60) return { grade: 'D', label: 'Needs Attention' };
    return { grade: 'F', label: 'Significant Issues' };
}

function generateAnalysisSummary(pricing, risk, missing, sanity, margin) {
    const summaryPoints = [];

    // Pricing summary
    if (pricing.winProbability >= 70) {
        summaryPoints.push({
            category: 'Pricing',
            status: 'positive',
            message: `Strong win probability (${pricing.winProbability}%) - pricing is competitive`
        });
    } else if (pricing.winProbability < 40) {
        summaryPoints.push({
            category: 'Pricing',
            status: 'negative',
            message: `Low win probability (${pricing.winProbability}%) - consider adjusting price`
        });
    }

    // Risk summary
    if (risk.level === 'High') {
        summaryPoints.push({
            category: 'Risk',
            status: 'negative',
            message: `High risk score (${risk.score}) - review risk factors and add contingency`
        });
    } else if (risk.level === 'Low') {
        summaryPoints.push({
            category: 'Risk',
            status: 'positive',
            message: `Low risk project (${risk.score}) - standard precautions apply`
        });
    }

    // Missing items summary
    if (missing.summary.criticalMissing > 0) {
        summaryPoints.push({
            category: 'Completeness',
            status: 'negative',
            message: `${missing.summary.criticalMissing} critical item(s) may be missing from bid`
        });
    }

    // Sanity check summary
    if (sanity.overallStatus === 'fail') {
        summaryPoints.push({
            category: 'Validation',
            status: 'negative',
            message: `${sanity.summary.failed} sanity check(s) failed - review before submitting`
        });
    }

    // Margin summary
    if (margin.recommendation && margin.recommendation.action !== 'maintain') {
        summaryPoints.push({
            category: 'Margin',
            status: 'info',
            message: margin.recommendation.message
        });
    }

    return summaryPoints;
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AIAnalyzer,
        CompetitorTracker,
        BidConfig,
        BidUtils,
        analyzePricing,
        calculateRiskScore,
        detectMissingItems,
        runSanityChecks,
        optimizeMargin
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AIAnalyzer = AIAnalyzer;
    window.CompetitorTracker = CompetitorTracker;
    window.BidConfig = BidConfig;
    window.BidUtils = BidUtils;
    window.analyzePricing = analyzePricing;
    window.calculateRiskScore = calculateRiskScore;
    window.detectMissingItems = detectMissingItems;
    window.runSanityChecks = runSanityChecks;
    window.optimizeMargin = optimizeMargin;
}
