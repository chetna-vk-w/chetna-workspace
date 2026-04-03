import { db } from "../db/sqlite.js";
import { getMemoryConfig } from "../utils/env.js";
function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
export function createSession(data) {
    const id = data.id || generateSessionId();
    db.prepare(`
        INSERT INTO Sessions (id, ownerId, type, topicId, title, context, parentSessionId, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.ownerId, data.type || "persistent", data.topicId || null, data.title || null, data.context || "", data.parentSessionId || null, 1);
    return getSession(id, data.ownerId);
}
export function getSession(sessionId, ownerId) {
    const session = db.prepare(`
        SELECT * FROM Sessions WHERE id = ? AND ownerId = ?
    `).get(sessionId, ownerId);
    if (session) {
        session.metadata = session.metadata ? JSON.parse(session.metadata) : {};
    }
    return session;
}
export function updateSession(sessionId, ownerId, updates) {
    const fields = [];
    const values = [];
    if (updates.type !== undefined) {
        fields.push("type = ?");
        values.push(updates.type);
    }
    if (updates.topicId !== undefined) {
        fields.push("topicId = ?");
        values.push(updates.topicId);
    }
    if (updates.title !== undefined) {
        fields.push("title = ?");
        values.push(updates.title);
    }
    if (updates.context !== undefined) {
        fields.push("context = ?");
        values.push(updates.context);
    }
    if (updates.isActive !== undefined) {
        fields.push("isActive = ?");
        values.push(updates.isActive ? 1 : 0);
    }
    fields.push("lastActivity = CURRENT_TIMESTAMP");
    values.push(sessionId, ownerId);
    db.prepare(`UPDATE Sessions SET ${fields.join(", ")} WHERE id = ? AND ownerId = ?`).run(...values);
    return getSession(sessionId, ownerId);
}
export function endSession(sessionId, ownerId) {
    const result = db.prepare(`
        UPDATE Sessions SET isActive = 0, endTime = CURRENT_TIMESTAMP 
        WHERE id = ? AND ownerId = ?
    `).run(sessionId, ownerId);
    return result.changes > 0;
}
export function listSessions(ownerId, filters) {
    const config = getMemoryConfig();
    const limit = filters?.limit ?? config.DEFAULT_SEARCH_LIMIT;
    const offset = filters?.offset ?? config.DEFAULT_SEARCH_OFFSET;
    let sql = "SELECT * FROM Sessions WHERE ownerId = ?";
    const params = [ownerId];
    if (filters?.type) {
        sql += " AND type = ?";
        params.push(filters.type);
    }
    if (filters?.topicId) {
        sql += " AND topicId = ?";
        params.push(filters.topicId);
    }
    if (filters?.isActive !== undefined) {
        sql += " AND isActive = ?";
        params.push(filters.isActive ? 1 : 0);
    }
    sql += " ORDER BY lastActivity DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    return db.prepare(sql).all(...params);
}
export function switchTopic(sessionId, ownerId, newTopicId) {
    const session = getSession(sessionId, ownerId);
    if (!session)
        return null;
    if (session.type !== "topic" && session.type !== "persistent") {
        return null;
    }
    db.prepare(`
        UPDATE Sessions SET topicId = ?, parentSessionId = COALESCE(parentSessionId, id)
        WHERE id = ?
    `).run(newTopicId, sessionId);
    return getSession(sessionId, ownerId);
}
export function mergeSessions(sessionIds, ownerId, newTitle) {
    if (sessionIds.length < 2)
        return null;
    const newSessionId = generateSessionId();
    const sessions = sessionIds.map(id => getSession(id, ownerId)).filter(Boolean);
    if (sessions.length < 2)
        return null;
    const mergedContext = sessions.map(s => s.context).filter(Boolean).join("\n---\n");
    db.prepare(`
        INSERT INTO Sessions (id, ownerId, type, title, context, isActive)
        VALUES (?, ?, 'cross', ?, ?, 1)
    `).run(newSessionId, ownerId, newTitle || "Merged Session", mergedContext);
    sessionIds.forEach(id => {
        db.prepare(`
            UPDATE Sessions SET parentSessionId = ? WHERE id = ? AND ownerId = ?
        `).run(newSessionId, id, ownerId);
    });
    return getSession(newSessionId, ownerId);
}
export function getSessionTimeline(ownerId, sessionId, options) {
    const config = getMemoryConfig();
    const limit = options?.limit ?? config.DEFAULT_SEARCH_LIMIT;
    const granularity = options?.granularity || "hour";
    let sql = "SELECT * FROM Timeline WHERE ownerId = ?";
    const params = [ownerId];
    if (sessionId) {
        sql += " AND sessionId = ?";
        params.push(sessionId);
    }
    if (options?.startDate) {
        sql += " AND timeSlot >= ?";
        params.push(options.startDate);
    }
    if (options?.endDate) {
        sql += " AND timeSlot <= ?";
        params.push(options.endDate);
    }
    sql += " ORDER BY timeSlot DESC LIMIT ?";
    params.push(limit);
    const entries = db.prepare(sql).all(...params);
    if (granularity === "hour") {
        return groupByHour(entries);
    }
    else {
        return groupByDay(entries);
    }
}
function groupByHour(entries) {
    const groups = new Map();
    entries.forEach(entry => {
        const date = new Date(entry.timeSlot);
        const hourKey = `${date.toISOString().slice(0, 13)}:00`;
        if (!groups.has(hourKey)) {
            groups.set(hourKey, []);
        }
        groups.get(hourKey).push(entry);
    });
    return Array.from(groups.entries()).map(([hour, items]) => ({
        timeSlot: hour,
        granularity: "hour",
        entries: items,
        count: items.length
    }));
}
function groupByDay(entries) {
    const groups = new Map();
    entries.forEach(entry => {
        const dayKey = entry.timeSlot.slice(0, 10);
        if (!groups.has(dayKey)) {
            groups.set(dayKey, []);
        }
        groups.get(dayKey).push(entry);
    });
    return Array.from(groups.entries()).map(([day, items]) => ({
        timeSlot: day,
        granularity: "day",
        entries: items,
        count: items.length
    }));
}
export function getCrossSessionMemories(ownerId, options) {
    const config = getMemoryConfig();
    const limit = options?.limit ?? config.DEFAULT_SEARCH_LIMIT;
    let sql = `
        SELECT * FROM Timeline 
        WHERE ownerId = ? AND sessionId IS NOT NULL
    `;
    const params = [ownerId];
    if (options?.topicId) {
        sql += " AND topicId = ?";
        params.push(options.topicId);
    }
    if (options?.startDate) {
        sql += " AND timeSlot >= ?";
        params.push(options.startDate);
    }
    if (options?.endDate) {
        sql += " AND timeSlot <= ?";
        params.push(options.endDate);
    }
    sql += " ORDER BY timeSlot DESC LIMIT ?";
    params.push(limit);
    const memories = db.prepare(sql).all(...params);
    if (options?.personId) {
        return memories.filter(m => {
            const entities = JSON.parse(m.entities || "[]");
            return entities.some((e) => e.includes(options.personId));
        });
    }
    return memories;
}
export function addTimelineEntry(ownerId, data) {
    const id = `tl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(`
        INSERT INTO Timeline 
        (id, ownerId, sessionId, topicId, perspectiveOf, sourcePersonId, content, memoryType, entities, relations, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, ownerId, data.sessionId || null, data.topicId || null, data.perspectiveOf || "self", data.sourcePersonId || null, data.content, data.memoryType || "general", JSON.stringify(data.entities || []), JSON.stringify(data.relations || []), data.priority || 0.5);
    return db.prepare("SELECT * FROM Timeline WHERE id = ?").get(id);
}
export function getTimelineForTopic(ownerId, topicId, options) {
    const config = getMemoryConfig();
    const limit = options?.limit ?? config.DEFAULT_SEARCH_LIMIT;
    const offset = options?.offset ?? config.DEFAULT_SEARCH_OFFSET;
    return db.prepare(`
        SELECT * FROM Timeline 
        WHERE ownerId = ? AND topicId = ?
        ORDER BY timeSlot DESC
        LIMIT ? OFFSET ?
    `).all(ownerId, topicId, limit, offset);
}
