import * as luxon from 'luxon';
import { Timestamp } from "./proto/google/protobuf/Timestamp";
import Long from 'long';

export function newTimestamp(offsetSecs = 0): Timestamp {
    let nowMs = Date.now();
    nowMs += offsetSecs * 1000;
    return { seconds: Math.round(nowMs / 1000) };
}

export function getRelativeDateFromTimestamp(ts: Timestamp): string {
    const dateTime = luxon.DateTime.fromSeconds(Long.fromValue(ts.seconds!).toNumber());
    let when = dateTime.toRelative();
    if (!when) {
        return 'unknown';
    }
    if (when === 'in 0 seconds') {
        when = 'just now';
    }
    return when;
}

/**
 * Returns true if the given timestamp represents a moment in the past. 
 * @param ts 
 */
export function isTimestampPast(ts: Timestamp): boolean {
    const then = luxon.DateTime.fromSeconds(Long.fromValue(ts.seconds!).toNumber());
    const now = luxon.DateTime.local();
    return then.toMillis() < now.toMillis();
}

/**
 * Format a timestamp like "2020-12-03".
 * @param ts 
 */
export function formatTimestampISODate(ts: Timestamp | null | undefined): string {
    if (!ts) {
        return 'UNKNOWN';
    }
    const createdAt: luxon.DateTime = luxon.DateTime.fromSeconds(
        Long.fromValue(ts.seconds!).toNumber());
    return createdAt.toISODate() || '';
}
