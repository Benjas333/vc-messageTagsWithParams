/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles/main.css";

import { BaseText } from "@components/BaseText";
import { Button, TextButton } from "@components/Button";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Switch } from "@components/Switch";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { TextInput, useEffect, useRef, useState } from "@webpack/common";

import { Param, ParamResponse } from "../types";


const cl = classNameFactory("vc-parameters-configurator-modal-");
function ParamDefiner({
    param,
    onChange,
    isPreview = false,
}: {
    param: Param,
    onChange: (newValue: ParamResponse) => void,
    isPreview?: boolean,
}) {
    const [value, setValue] = useState(param.default ?? "");
    const [isOptional, setIsOptional] = useState(isPreview ? param.default != null : false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        onChange({
            name: param.name,
            value,
            default: isPreview ? param.default : isOptional ? value : undefined,
        });
    }, [isOptional]);

    return (
        <>
            <Heading tag="h5" className={cl("title")}>
                {`$${param.name}$ param`}
            </Heading>
            <div className={cl("param-section")}>
                <div>
                    <BaseText>Optional?</BaseText>
                    <Switch
                        disabled={isPreview}
                        checked={isOptional}
                        onChange={setIsOptional}
                    />
                </div>
                <div className={cl("text-input")}>
                    <BaseText>
                    {isPreview
                    ? "Value"
                    : "Default value"}
                    </BaseText>
                    <TextInput
                        ref={inputRef}
                        disabled={!isOptional && !isPreview}
                        value={value}
                        onChange={value => {
                            setValue(value);
                            onChange({
                                name: param.name,
                                value,
                                default: isPreview ? param.default : isOptional ? value : undefined,
                            });
                        }}
                        minLength={isPreview ? Number(isOptional) : undefined}
                    />
                </div>
            </div>
        </>
    );
}

export function ParamsConfigModal({
    modalProps,
    params,
    onSave,
    isPreview = false,
}: {
    modalProps: ModalProps,
    params: Param[],
    onSave: (values: { [key: string]: ParamResponse }) => void,
    isPreview?: boolean,
}) {
    const [hasInvalidData, setHasInvalidData] = useState<boolean>(isPreview);
    const [paramValues, setParamValues] = useState<{ [key: string]: ParamResponse }>(() => {
        const initialValues: { [key: string]: ParamResponse } = {};
        params.forEach(p => {
            initialValues[p.name] = {
                name: p.name,
                value: p.default ?? "",
                default: p.default
            };
        });
        return initialValues;
    });

    useEffect(() => {
        if (!isPreview) return;

        for (const paramName in paramValues) {
            if (!Object.hasOwn(paramValues, paramName)) continue;

            const param = paramValues[paramName];
            if (param.default == null && !param.value) {
                setHasInvalidData(true);
                return;
            }
        }
        setHasInvalidData(false);
    }, [paramValues]);

    const handleSave = () => {
        if (isPreview && hasInvalidData) return;

        onSave(paramValues);
        modalProps.onClose();
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
            <ModalHeader className={cl("header")}>
                <Heading tag="h4" className={cl("title")}>
                    MessageTags Parameters Config
                </Heading>
                <ModalCloseButton onClick={modalProps.onClose} className={cl("close-button")} />
            </ModalHeader>

            <ModalContent className={cl("content")}>
                {params.map((param, index) => (
                    <ParamDefiner
                        key={index}
                        param={param}
                        onChange={newParam => setParamValues(prev => ({
                            ...prev,
                            [param.name]: newParam
                        }))}
                        isPreview={isPreview}
                    />
                ))}
                {isPreview && hasInvalidData &&
                    <Heading tag="h4" className={cl("error")}>There's empty params that are required</Heading>
                }
                <Flex className={classes(Margins.bottom8, Margins.top8)}>
                    <TextButton
                        variant="primary"
                        onClick={modalProps.onClose}
                    >
                        Cancel
                    </TextButton>
                    <Button
                        disabled={isPreview && hasInvalidData}
                        variant="primary"
                        onClick={handleSave}
                    >
                        Save & Close
                    </Button>
                </Flex>
            </ModalContent>
        </ModalRoot>
    );
}

// export function ParamsConfigModal({
//     modalProps,
//     params,
//     onSave,
// }: {
//     modalProps: ModalProps,
//     params: Param[],
//     onSave: (values: { [key: string]: ParamResponse }) => void,
// }) {
//     const [paramValues, setParamValues] = useState<{ [key: string]: ParamResponse }>(() => {
//         const initialValues: { [key: string]: ParamResponse } = {};
//         params.forEach(p => {
//             initialValues[p.name] = {
//                 name: p.name,
//                 value: p.default ?? "",
//                 default: p.default
//             };
//         });
//         return initialValues;
//     });

//     const handleSave = () => {
//         onSave(paramValues);
//         modalProps.onClose();
//     };

//     return (
//         <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
//             <ModalHeader className={cl("header")}>
//                 <Heading tag="h4" className={cl("title")}>
//                     MessageTags Parameters Configurator
//                 </Heading>
//                 <ModalCloseButton onClick={modalProps.onClose} className={cl("close-button")} />
//             </ModalHeader>

//             <ModalContent className={cl("content")}>
//                 {params.map((param, index) => (
//                     <ParamDefiner
//                         key={index}
//                         param={param}
//                         onChange={newParam => setParamValues(prev => ({
//                             ...prev,
//                             [param.name]: newParam
//                         }))}
//                     />
//                 ))}
//                 <Flex className={classes(Margins.bottom8, Margins.top8)}>
//                     <TextButton
//                         variant="primary"
//                         onClick={modalProps.onClose}
//                     >
//                         Cancel
//                     </TextButton>
//                     <Button
//                         variant="primary"
//                         onClick={handleSave}
//                     >
//                         Save & Close
//                     </Button>
//                 </Flex>
//             </ModalContent>
//         </ModalRoot>
//     );
// }

// export function ParamsPreviewModal({
//     modalProps,
//     params,
//     onSave,
// }: {
//     modalProps: ModalProps,
//     params: Param[],
//     onSave: (values: { [key: string]: ParamResponse }) => void,
// }) {
//     const [hasInvalidData, setHasInvalidData] = useState(true);
//     const [paramValues, setParamValues] = useState<{ [key: string]: ParamResponse }>(() => {
//         const initialValues: { [key: string]: ParamResponse } = {};
//         params.forEach(p => {
//             initialValues[p.name] = {
//                 name: p.name,
//                 value: p.default ?? "",
//                 default: p.default
//             };
//         });
//         return initialValues;
//     });

//     useEffect(() => {
//         for (const paramName in paramValues) {
//             if (!Object.hasOwn(paramValues, paramName)) continue;

//             const param = paramValues[paramName];

//             if (param.default == null && !param.value) {
//                 setHasInvalidData(true);
//                 return;
//             }
//         }
//         setHasInvalidData(false);
//     }, [paramValues]);

//     const handleSave = () => {
//         for (const paramName in paramValues) {
//             if (!Object.hasOwn(paramValues, paramName)) continue;

//             const param = paramValues[paramName];

//             if (param.default == null && !param.value) return;
//         }
//         onSave(paramValues);
//         modalProps.onClose();
//     };

//     return (
//         <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
//             <ModalHeader className={cl("header")}>
//                 <Heading tag="h4" className={cl("title")}>
//                     MessageTags Parameters Configurator
//                 </Heading>
//                 <ModalCloseButton onClick={modalProps.onClose} className={cl("close-button")} />
//             </ModalHeader>

//             <ModalContent className={cl("content")}>
//                 {params.map((param, index) => (
//                     <ParamDefiner
//                         key={index}
//                         param={param}
//                         onChange={newParam => setParamValues(prev => ({
//                             ...prev,
//                             [param.name]: newParam
//                         }))}
//                         isPreview
//                     />
//                 ))}
//                 {hasInvalidData && <Heading tag="h4" className={cl("error")}>There's empty params that are required</Heading>}
//                 <Flex className={classes(Margins.bottom8, Margins.top8)}>
//                     <TextButton
//                         variant="secondary"
//                         onClick={modalProps.onClose}
//                     >
//                         Cancel
//                     </TextButton>
//                     <Button
//                         disabled={hasInvalidData}
//                         variant="primary"
//                         onClick={handleSave}
//                     >
//                         Save & Close
//                     </Button>
//                 </Flex>
//             </ModalContent>
//         </ModalRoot>
//     );
// }
