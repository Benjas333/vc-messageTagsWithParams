/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import { DataStore } from "@api/index";
import messageTags from "@plugins/messageTags";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { CommandArgument, CommandContext, CommandOption } from "@vencord/discord-types";

import { ParamsConfigModal } from "./components/ParamsConfigModal";
import { Param, TagWParams } from "./types";

const EMOTE = "<:luna:1035316192220553236><:benPotFriend:1231820097685819452>";
const DATA_KEY = "MessageTags_TAGS";
const MessageTagsMarker = Symbol("MessageTags");

messageTags.settings.def.tagsList = {
    type: OptionType.CUSTOM,
    default: {} as Record<string, TagWParams>,
};

const getTags = () => {
    return messageTags.settings.store.tagsList as Record<string, TagWParams>;
};

const getTag = (name: string) => {
    return messageTags.settings.store.tagsList[name] as TagWParams ?? null;
};

const addTag = (tag: TagWParams) => {
    messageTags.settings.store.tagsList[tag.name] = tag;
};

const removeTag = (name: string) => {
    delete messageTags.settings.store.tagsList[name];
};

function generateOptionsFromParamsTag(params: Param[] | null) {
    const options: CommandOption[] = [];
    params?.forEach(param => {
        const notDefault = param.default == null;
        options.push({
            name: param.name,
            description: param.name + (!notDefault ? ` (Default: "${param.default}")` : ""),
            type: ApplicationCommandOptionType.STRING,
            required: notDefault,
        });
    });
    return options;
}

function createTagCommand(tag: TagWParams) {
    const options = generateOptionsFromParamsTag(tag.params || null);
    registerCommand({
        name: tag.name,
        description: tag.name,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        options,
        execute: (args, ctx) => {
            if (!getTag(tag.name)) {
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} The tag **${tag.name}** does not exist anymore! Please reload your client to fix :)`
                });
                return { content: `/${tag.name}` };
            }

            if (messageTags.settings.store.clyde)
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} The tag **${tag.name}** has been sent!`
                });
            let finalMessage = tag.message.replaceAll("\\n", "\n");
            args.forEach(arg => {
                finalMessage = finalMessage.replaceAll(`$${arg.name}$`, arg.value);
            });
            tag.params?.forEach(param => {
                if (param.default == null) return;
                finalMessage = finalMessage.replaceAll(`$${param.name}$`, param.default);
            });
            return { content: finalMessage };
        },
        [MessageTagsMarker]: true,
    }, "CustomTags");
}

messageTags.start = async () => {
    // TODO(OptionType.CUSTOM Related): Remove DataStore tags migration once enough time has passed
    const oldTags = await DataStore.get<TagWParams[]>(DATA_KEY);
    if (oldTags != null) {
        // @ts-ignore
        settings.store.tagsList = Object.fromEntries(oldTags.map(oldTag => (delete oldTag.enabled, [oldTag.name, oldTag])));
        await DataStore.del(DATA_KEY);
    }

    const tags = getTags();
    for (const tagName in tags) {
        createTagCommand(tags[tagName]);
    }
};

const execute = async (args: CommandArgument[], ctx: CommandContext) => {
    switch (args[0].name) {
        case "create": {
            const name: string = findOption(args[0].options, "tag-name", "");
            const message: string = findOption(args[0].options, "message", "");

            if (getTag(name))
                return sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} A Tag with the name **${name}** already exists!`
                });

            const matches = new Set<string>();
            const raw_matches = message.matchAll(/\$([^$\s]+)\$/g);
            for (const match of raw_matches) {
                matches.add(match[1]);
            }

            const tag: TagWParams = {
                name,
                message,
                params: matches.size ? [] : undefined,
            };

            for (const name of matches) {
                tag.params?.push({ name });
            }

            const createTag = () => {
                createTagCommand(tag);
                addTag(tag);
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} Successfully created the tag **${name}**!`
                });
                updateCommandsList();
            };
            if (!tag.params?.length) {
                createTag();
                break;
            }

            openModal(modalProps => (<ParamsConfigModal
                modalProps={modalProps}
                params={tag.params!}
                onSave={response => {
                    tag.params = [];
                    for (const paramName in response) {
                        if (!Object.hasOwn(response, paramName)) continue;

                        const param = response[paramName];
                        tag.params.push({
                            name: param.name,
                            default: param.default,
                        });
                    }
                    createTag();
                }}
            />));
            break; // end 'create'
        }

        case "delete": {
            const name: string = findOption(args[0].options, "tag-name", "");

            if (!getTag(name))
                return sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                });

            unregisterCommand(name);
            removeTag(name);
            updateCommandsList();

            sendBotMessage(ctx.channel.id, {
                content: `${EMOTE} Successfully deleted the tag **${name}**!`
            });
            break; // end 'delete'
        }

        case "list": {
            sendBotMessage(ctx.channel.id, {
                embeds: [
                    {
                        title: "All Tags:",
                        description: Object.values(getTags())
                            .map(tag => `\`${tag.name}\`: ${tag.message.slice(0, 72).replaceAll("\\n", " ")}${tag.message.length > 72 ? "..." : ""}`)
                            .join("\n") || `${EMOTE} Woops! There are no tags yet, use \`/tags create\` to create one!`,
                        // @ts-ignore
                        color: 0xd77f7f,
                        type: "rich",
                    }
                ]
            });
            break; // end 'list'
        }

        case "preview": {
            const name: string = findOption(args[0].options, "tag-name", "");
            const tag = getTag(name);

            if (!tag)
                return sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                });

            let finalMessage = tag.message.replaceAll("\\n", "\n");
            const preview = () => {
                sendBotMessage(ctx.channel.id, {
                    content: finalMessage
                });
            };
            if (!tag.params?.length) {
                preview();
                break;
            }

            openModal(modalProps => (<ParamsConfigModal
                modalProps={modalProps}
                params={tag.params!}
                onSave={response => {
                    for (const paramName in response) {
                        if (!Object.hasOwn(response, paramName)) continue;

                        const param = response[paramName];
                        finalMessage = finalMessage.replaceAll(`$${param.name}$`, param.value);
                    }
                    preview();
                }}
                isPreview
            />));
            break; // end 'preview'
        }

        default: {
            sendBotMessage(ctx.channel.id, {
                content: "Invalid sub-command"
            });
            break;
        }
    }
};
messageTags.commands[0].execute = execute;

const updateCommandsList = () => {
    unregisterCommand("tags delete");
    unregisterCommand("tags preview");
    const newChoicesList = Object.keys(getTags()).map(e => ({
        label: e,
        value: e,
        name: e,
    }));
    registerCommand({
        name: "tags",
        description: "Manage all the tags for yourself",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "delete",
                description: "Remove a tag from your yourself",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "tag-name",
                        description: "The name of the tag to delete",
                        type: ApplicationCommandOptionType.STRING,
                        required: true,
                        choices: newChoicesList,
                    }
                ]
            },
            {
                name: "preview",
                description: "Preview a tag without sending it publicly",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "tag-name",
                        description: "The name of the tag to preview the response",
                        type: ApplicationCommandOptionType.STRING,
                        required: true,
                        choices: newChoicesList,
                    }
                ]
            },
        ],
        execute,
    }, "MessageTags");
};

export default definePlugin({
    name: "MessageTagsWithParams",
    description: "Allows you to save messages and to use them with a simple command. But now with custom parameters!",
    authors: [{
        name: "Benjas333",
        id: 456577284464443394n,
    }],
    dependencies: ["MessageTags"],

    start() {
        updateCommandsList();
    }
});
