import { db } from "../db/sqlite.js";
import { getMemoryConfig } from "../utils/env.js";
function getDateRange(range) {
    const now = new Date();
    const end = now.toISOString();
    let start;
    switch (range) {
        case "today":
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case "week":
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case "month":
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            start = new Date(0);
    }
    return { start: start.toISOString(), end };
}
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
function truncateToTokens(text, maxTokens) {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars)
        return text;
    return text.slice(0, maxChars) + "...";
}
export function getBetterContext(options) {
    const config = getMemoryConfig();
    const maxTokens = options.maxTokens || config.DEFAULT_SEARCH_LIMIT * 100;
    const result = {
        context: {
            current: { recent: [] },
            timeline: [],
            topics: {},
            relations: {},
            sharedFromOthers: []
        },
        tokens: 0,
        summary: ""
    };
    const { start, end } = getDateRange(options.timeRange || "week");
    if (options.includeTimeline !== false) {
        result.context.timeline = getTimelineContext(options.ownerId, options.sessionId, start, end);
    }
    if (options.includeTopics !== false) {
        result.context.topics = getTopicsContext(options.ownerId, options.topicFilter);
    }
    if (options.includeRelations !== false) {
        result.context.relations = getRelationsContext(options.ownerId, options.personFilter);
    }
    if (options.includeShared !== false) {
        result.context.sharedFromOthers = getSharedContext(options.ownerId);
    }
    if (options.sessionId) {
        result.context.current.session = getCurrentSession(options.ownerId, options.sessionId);
    }
    if (options.topicId) {
        result.context.current.topic = getTopic(options.ownerId, options.topicId);
    }
    result.context.current.recent = getRecentMemories(options.ownerId, start, end, 10);
    let fullContext = JSON.stringify(result.context);
    result.tokens = estimateTokens(fullContext);
    if (result.tokens > maxTokens) {
        fullContext = truncateToTokens(fullContext, maxTokens);
        result.tokens = maxTokens;
    }
    result.summary = generateSummary(result);
    return result;
}
function getTimelineContext(ownerId, sessionId, start, end) {
    let sql = `
        SELECT * FROM Timeline 
        WHERE ownerId = ?
    `;
    const params = [ownerId];
    if (sessionId) {
        sql += " AND sessionId = ?";
        params.push(sessionId);
    }
    if (start) {
        sql += " AND timeSlot >= ?";
        params.push(start);
    }
    if (end) {
        sql += " AND timeSlot <= ?";
        params.push(end);
    }
    sql += " ORDER BY timeSlot DESC LIMIT 50";
    const entries = db.prepare(sql).all(...params);
    const grouped = new Map();
    entries.forEach(entry => {
        const day = entry.timeSlot.slice(0, 10);
        if (!grouped.has(day)) {
            grouped.set(day, []);
        }
        grouped.get(day).push(entry);
    });
    return Array.from(grouped.entries()).map(([date, items]) => ({
        date,
        entries: items,
        summary: items.length + " memories"
    }));
}
function getTopicsContext(ownerId, filter) {
    let sql = "SELECT * FROM Topics WHERE ownerId = ? AND isActive = 1";
    const params = [ownerId];
    if (filter && filter.length > 0) {
        sql += ` AND name IN (${filter.map(() => "?").join(",")})`;
        params.push(...filter);
    }
    const topics = db.prepare(sql).all(...params);
    const result = {};
    topics.forEach(topic => {
        const memories = db.prepare(`
            SELECT * FROM Timeline 
            WHERE ownerId = ? AND topicId = ?
            ORDER BY timeSlot DESC LIMIT 10
        `).all(ownerId, topic.id);
        result[topic.name] = memories.map(m => ({
            id: m.id,
            content: m.content.slice(0, 100),
            time: m.timeSlot,
            perspective: m.perspectiveOf
        }));
    });
    return result;
}
function getRelationsContext(ownerId, personFilter) {
    let sql = `
        SELECT e.*, r.relationType, r.fromId, r.toId, r.properties as relProperties
        FROM Entities e
        LEFT JOIN Relations r ON (e.id = r.fromId OR e.id = r.toId)
        WHERE e.ownerId = ? AND e.entityType IN ('Person', 'Bot', 'Organization')
    `;
    const params = [ownerId];
    if (personFilter && personFilter.length > 0) {
        sql += ` AND e.name IN (${personFilter.map(() => "?").join(",")})`;
        params.push(...personFilter);
    }
    sql += " LIMIT 50";
    const entities = db.prepare(sql).all(...params);
    const result = {};
    entities.forEach(entity => {
        const key = entity.name;
        if (!result[key]) {
            result[key] = {
                id: entity.id,
                type: entity.entityType,
                email: entity.email,
                role: entity.role,
                relationships: [],
                sharedInfo: []
            };
        }
        if (entity.relationType) {
            const relProps = entity.relProperties ? JSON.parse(entity.relProperties) : {};
            const isFrom = entity.fromId === entity.id;
            result[key].relationships.push({
                type: entity.relationType,
                relatedTo: isFrom ? "other" : entity.fromId,
                properties: relProps
            });
        }
    });
    return result;
}
function getSharedContext(ownerId) {
    const shared = db.prepare(`
        SELECT sm.*, 
               t.content as memoryContent,
               t.entities as memoryEntities,
               e.name as fromPersonName
        FROM SharedMemories sm
        LEFT JOIN Timeline t ON sm.memoryId = t.id AND sm.memoryType = 'timeline'
        LEFT JOIN Entities e ON sm.fromOwnerId = e.ownerId
        WHERE sm.toOwnerId = ? AND sm.isRead = 0
        ORDER BY sm.createdAt DESC
        LIMIT 20
    `).all(ownerId);
    return shared.map(s => ({
        id: s.id,
        from: s.fromOwnerId,
        fromPerson: s.fromPersonName,
        content: s.memoryContent?.slice(0, 200),
        perspective: s.perspectiveNote,
        sharedAt: s.createdAt
    }));
}
function getCurrentSession(ownerId, sessionId) {
    return db.prepare(`
        SELECT * FROM Sessions WHERE id = ? AND ownerId = ?
    `).get(sessionId, ownerId);
}
function getTopic(ownerId, topicId) {
    return db.prepare(`
        SELECT * FROM Topics WHERE id = ? AND ownerId = ?
    `).get(topicId, ownerId);
}
function getRecentMemories(ownerId, start, end, limit) {
    let sql = `
        SELECT * FROM Timeline 
        WHERE ownerId = ?
    `;
    const params = [ownerId];
    if (start) {
        sql += " AND timeSlot >= ?";
        params.push(start);
    }
    if (end) {
        sql += " AND timeSlot <= ?";
        params.push(end);
    }
    sql += " ORDER BY timeSlot DESC LIMIT ?";
    params.push(limit || 10);
    return db.prepare(sql).all(...params);
}
function generateSummary(result) {
    const parts = [];
    if (result.context.timeline.length > 0) {
        parts.push(`${result.context.timeline.length} days of memories`);
    }
    const topicCount = Object.keys(result.context.topics).length;
    if (topicCount > 0) {
        parts.push(`${topicCount} topics active`);
    }
    const personCount = Object.keys(result.context.relations).length;
    if (personCount > 0) {
        parts.push(`${personCount} people/bots in network`);
    }
    if (result.context.sharedFromOthers.length > 0) {
        parts.push(`${result.context.sharedFromOthers.length} items shared with you`);
    }
    return parts.join(", ") || "No context available";
}
export function getPerspectiveContext(ownerId, perspectiveOf, options) {
    const config = getMemoryConfig();
    const limit = options?.limit ?? config.DEFAULT_SEARCH_LIMIT;
    let sql = `
        SELECT * FROM Timeline 
        WHERE ownerId = ? AND perspectiveOf = ?
    `;
    const params = [ownerId, perspectiveOf];
    if (options?.sessionId) {
        sql += " AND sessionId = ?";
        params.push(options.sessionId);
    }
    if (options?.topicId) {
        sql += " AND topicId = ?";
        params.push(options.topicId);
    }
    sql += " ORDER BY timeSlot DESC LIMIT ?";
    params.push(limit);
    return db.prepare(sql).all(...params);
}
export function getMemoryForPerson(ownerId, personId, options) {
    const config = getMemoryConfig();
    const limit = options?.limit ?? config.DEFAULT_SEARCH_LIMIT;
    let sql = `
        SELECT * FROM Timeline 
        WHERE ownerId = ? AND (entities LIKE ? OR sourcePersonId = ?)
    `;
    const params = [ownerId, `%${personId}%`, personId];
    if (options?.perspective && options.perspective !== "all") {
        sql += " AND perspectiveOf = ?";
        params.push(options.perspective);
    }
    sql += " ORDER BY timeSlot DESC LIMIT ?";
    params.push(limit);
    return db.prepare(sql).all(...params);
}
