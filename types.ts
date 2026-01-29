/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Param {
    name: string;
    default?: string;
}

export interface ParamResponse extends Param {
    value: string
}

export interface TagWParams {
    name: string;
    message: string;
    params?: Param[];
}
