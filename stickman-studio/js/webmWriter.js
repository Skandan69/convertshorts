// Vendored from npm package webm-writer@1.0.0 (WTFPLv2), by Nicholas Sherlock.
// https://github.com/thenickdude/webm-writer-js — concatenation of ArrayBufferDataStream.js +
// BlobBuffer.js + WebMWriter.js. Used to build a WebM video directly from a sequence of canvas
// frames (no real-time recording, no MediaRecorder, no dependency on requestAnimationFrame or
// wall-clock timing) — see js/ui.js exportBtn handler for how it's used.

/**
 * A tool for presenting an ArrayBuffer as a stream for writing some simple data types.
 *
 * By Nicholas Sherlock
 *
 * Released under the WTFPLv2 https://en.wikipedia.org/wiki/WTFPL
 */

"use strict";

(function(){
    /*
     * Create an ArrayBuffer of the given length and present it as a writable stream with methods
     * for writing data in different formats.
     */
    let ArrayBufferDataStream = function(length) {
        this.data = new Uint8Array(length);
        this.pos = 0;
    };
    
    ArrayBufferDataStream.prototype.seek = function(toOffset) {
        this.pos = toOffset;
    };

    ArrayBufferDataStream.prototype.writeBytes = function(arr) {
        for (let i = 0; i < arr.length; i++) {
            this.data[this.pos++] = arr[i];
        }
    };

    ArrayBufferDataStream.prototype.writeByte = function(b) {
        this.data[this.pos++] = b;
    };
    
    //Synonym:
    ArrayBufferDataStream.prototype.writeU8 = ArrayBufferDataStream.prototype.writeByte;
    
    ArrayBufferDataStream.prototype.writeU16BE = function(u) {
        this.data[this.pos++] = u >> 8;
        this.data[this.pos++] = u;
    };

    ArrayBufferDataStream.prototype.writeDoubleBE = function(d) {
        let
            bytes = new Uint8Array(new Float64Array([d]).buffer);
        
        for (let i = bytes.length - 1; i >= 0; i--) {
            this.writeByte(bytes[i]);
        }
    };

    ArrayBufferDataStream.prototype.writeFloatBE = function(d) {
        let
            bytes = new Uint8Array(new Float32Array([d]).buffer);
        
        for (let i = bytes.length - 1; i >= 0; i--) {
            this.writeByte(bytes[i]);
        }
    };

    /**
     * Write an ASCII string to the stream
     */
    ArrayBufferDataStream.prototype.writeString = function(s) {
        for (let i = 0; i < s.length; i++) {
            this.data[this.pos++] = s.charCodeAt(i);
        }
    };

    /**
     * Write the given 32-bit integer to the stream as an EBML variable-length integer using the given byte width
     * (use measureEBMLVarInt).
     *
     * No error checking is performed to ensure that the supplied width is correct for the integer.
     *
     * @param i Integer to be written
     * @param width Number of bytes to write to the stream
     */
    ArrayBufferDataStream.prototype.writeEBMLVarIntWidth = function(i, width) {
        switch (width) {
            case 1:
                this.writeU8((1 << 7) | i);
            break;
            case 2:
                this.writeU8((1 << 6) | (i >> 8));
                this.writeU8(i);
            break;
            case 3:
                this.writeU8((1 << 5) | (i >> 16));
                this.writeU8(i >> 8);
                this.writeU8(i);
            break;
            case 4:
                this.writeU8((1 << 4) | (i >> 24));
                this.writeU8(i >> 16);
                this.writeU8(i >> 8);
                this.writeU8(i);
            break;
            case 5:
                this.writeU8((1 << 3) | ((i / 4294967296) & 0x7));
                this.writeU8(i >> 24);
                this.writeU8(i >> 16);
                this.writeU8(i >> 8);
                this.writeU8(i);
            break;
            default:
                throw new Error("Bad EBML VINT size " + width);
        }
    };
    
    ArrayBufferDataStream.prototype.measureEBMLVarInt = function(val) {
        if (val < (1 << 7) - 1) {
            return 1;
        } else if (val < (1 << 14) - 1) {
            return 2;
        } else if (val < (1 << 21) - 1) {
            return 3;
        } else if (val < (1 << 28) - 1) {
            return 4;
        } else if (val < 34359738367) {
            return 5;
        } else {
            throw new Error("EBML VINT size not supported " + val);
        }
    };
    
    ArrayBufferDataStream.prototype.writeEBMLVarInt = function(i) {
        this.writeEBMLVarIntWidth(i, this.measureEBMLVarInt(i));
    };
    
    ArrayBufferDataStream.prototype.writeUnsignedIntBE = function(u, width) {
        if (width === undefined) {
            width = this.measureUnsignedInt(u);
        }
        
        switch (width) {
            case 5:
                this.writeU8(Math.floor(u / 4294967296));
            case 4:
                this.writeU8(u >> 24);
            case 3:
                this.writeU8(u >> 16);
            case 2:
                this.writeU8(u >> 8);
            case 1:
                this.writeU8(u);
            break;
            default:
                throw new Error("Bad UINT size " + width);
        }
    };
    
    ArrayBufferDataStream.prototype.measureUnsignedInt = function(val) {
        if (val < (1 << 8)) {
            return 1;
        } else if (val < (1 << 16)) {
            return 2;
        } else if (val < (1 << 24)) {
            return 3;
        } else if (val < 4294967296) {
            return 4;
        } else {
            return 5;
        }
    };

    ArrayBufferDataStream.prototype.getAsDataArray = function() {
        if (this.pos < this.data.byteLength) {
            return this.data.subarray(0, this.pos);
        } else if (this.pos == this.data.byteLength) {
            return this.data;
        } else {
            throw new Error("ArrayBufferDataStream's pos lies beyond end of buffer");
        }
    };
	
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = ArrayBufferDataStream;
	} else {
		window.ArrayBufferDataStream = ArrayBufferDataStream;
	}
}());

"use strict";

/**
 * Allows a series of Blob-convertible objects (ArrayBuffer, Blob, String, etc) to be added to a buffer. Seeking and
 * overwriting of blobs is allowed.
 *
 * By Nicholas Sherlock
 *
 * Released under the WTFPLv2 https://en.wikipedia.org/wiki/WTFPL
 */
(function() {
	let BlobBuffer = function(fs) {
		return function(destination) {
			let
				buffer = [],
				writePromise = Promise.resolve(),
				fileWriter = null,
				fd = null;
			
			if (destination && destination.constructor.name === "FileWriter") {
				fileWriter = destination;
			} else if (fs && destination) {
				fd = destination;
			}
			
			this.pos = 0;
			this.length = 0;
			
			function readBlobAsBuffer(blob) {
				return new Promise(function (resolve, reject) {
					let
						reader = new FileReader();
					
					reader.addEventListener("loadend", function () {
						resolve(reader.result);
					});
					
					reader.readAsArrayBuffer(blob);
				});
			}
			
			function convertToUint8Array(thing) {
				return new Promise(function (resolve, reject) {
					if (thing instanceof Uint8Array) {
						resolve(thing);
					} else if (thing instanceof ArrayBuffer || ArrayBuffer.isView(thing)) {
						resolve(new Uint8Array(thing));
					} else if (thing instanceof Blob) {
						resolve(readBlobAsBuffer(thing).then(function (buffer) {
							return new Uint8Array(buffer);
						}));
					} else {
						resolve(readBlobAsBuffer(new Blob([thing])).then(function (buffer) {
							return new Uint8Array(buffer);
						}));
					}
				});
			}
			
			function measureData(data) {
				let
					result = data.byteLength || data.length || data.size;
				
				if (!Number.isInteger(result)) {
					throw new Error("Failed to determine size of element");
				}
				
				return result;
			}
			
			this.seek = function (offset) {
				if (offset < 0) {
					throw new Error("Offset may not be negative");
				}
				
				if (isNaN(offset)) {
					throw new Error("Offset may not be NaN");
				}
				
				if (offset > this.length) {
					throw new Error("Seeking beyond the end of file is not allowed");
				}
				
				this.pos = offset;
			};
			
			this.write = function (data) {
				let
					newEntry = {
						offset: this.pos,
						data: data,
						length: measureData(data)
					},
					isAppend = newEntry.offset >= this.length;
				
				this.pos += newEntry.length;
				this.length = Math.max(this.length, this.pos);
				
				writePromise = writePromise.then(function () {
					if (fd) {
						return new Promise(function(resolve, reject) {
							convertToUint8Array(newEntry.data).then(function(dataArray) {
								let
									totalWritten = 0,
									buffer = Buffer.from(dataArray.buffer),
									
									handleWriteComplete = function(err, written, buffer) {
										totalWritten += written;
										
										if (totalWritten >= buffer.length) {
											resolve();
										} else {
											fs.write(fd, buffer, totalWritten, buffer.length - totalWritten, newEntry.offset + totalWritten, handleWriteComplete);
										}
									};
								
								fs.write(fd, buffer, 0, buffer.length, newEntry.offset, handleWriteComplete);
							});
						});
					} else if (fileWriter) {
						return new Promise(function (resolve, reject) {
							fileWriter.onwriteend = resolve;
							
							fileWriter.seek(newEntry.offset);
							fileWriter.write(new Blob([newEntry.data]));
						});
					} else if (!isAppend) {
						for (let i = 0; i < buffer.length; i++) {
							let
								entry = buffer[i];
							
							if (!(newEntry.offset + newEntry.length <= entry.offset || newEntry.offset >= entry.offset + entry.length)) {
								if (newEntry.offset < entry.offset || newEntry.offset + newEntry.length > entry.offset + entry.length) {
									throw new Error("Overwrite crosses blob boundaries");
								}
								
								if (newEntry.offset == entry.offset && newEntry.length == entry.length) {
									entry.data = newEntry.data;
									
									return;
								} else {
									return convertToUint8Array(entry.data)
										.then(function (entryArray) {
											entry.data = entryArray;
											
											return convertToUint8Array(newEntry.data);
										}).then(function (newEntryArray) {
											newEntry.data = newEntryArray;
											
											entry.data.set(newEntry.data, newEntry.offset - entry.offset);
										});
								}
							}
						}
					}
					
					buffer.push(newEntry);
				});
			};
			
			this.complete = function (mimeType) {
				if (fd || fileWriter) {
					writePromise = writePromise.then(function () {
						return null;
					});
				} else {
					writePromise = writePromise.then(function () {
						let
							result = [];
						
						for (let i = 0; i < buffer.length; i++) {
							result.push(buffer[i].data);
						}
						
						return new Blob(result, {type: mimeType});
					});
				}
				
				return writePromise;
			};
		};
	};
	
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = BlobBuffer;
	} else {
		window.BlobBuffer = BlobBuffer(null);
	}
})();

/**
 * WebM video encoder for Google Chrome. This implementation is suitable for creating very large video files, because
 * it can stream Blobs directly to a FileWriter without buffering the entire video in memory.
 *
 * When FileWriter is not available or not desired, it can buffer the video in memory as a series of Blobs which are
 * eventually returned as one composite Blob.
 *
 * By Nicholas Sherlock.
 *
 * Based on the ideas from Whammy: https://github.com/antimatter15/whammy
 *
 * Released under the WTFPLv2 https://en.wikipedia.org/wiki/WTFPL
 */

"use strict";

(function() {
    function extend(base, top) {
        let
            target = {};
        
        [base, top].forEach(function(obj) {
            for (let prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    target[prop] = obj[prop];
                }
            }
        });
        
        return target;
    }
    
    function decodeBase64WebPDataURL(url) {
        if (typeof url !== "string" || !url.match(/^data:image\/webp;base64,/i)) {
            throw new Error("Failed to decode WebP Base64 URL");
        }
        
        return window.atob(url.substring("data:image/webp;base64,".length));
    }
    
    function renderAsWebP(canvas, quality) {
        let
            frame = typeof canvas === 'string' && /^data:image\/webp/.test(canvas)
                ? canvas
                : canvas.toDataURL('image/webp', quality);
        
        return decodeBase64WebPDataURL(frame);
    }
    
    function byteStringToUint32LE(string) {
        let
            a = string.charCodeAt(0),
            b = string.charCodeAt(1),
            c = string.charCodeAt(2),
            d = string.charCodeAt(3);
    
        return (a | (b << 8) | (c << 16) | (d << 24)) >>> 0;
    }
    
    function extractKeyframeFromWebP(webP) {
        let
            cursor = webP.indexOf('VP8', 12);
    
        if (cursor === -1) {
            throw new Error("Bad image format, does this browser support WebP?");
        }
        
        let
            hasAlpha = false;
    
        while (cursor < webP.length - 8) {
            let
                chunkLength, fourCC;
    
            fourCC = webP.substring(cursor, cursor + 4);
            cursor += 4;

            chunkLength = byteStringToUint32LE(webP.substring(cursor, cursor + 4));
            cursor += 4;
            
            switch (fourCC) {
                case "VP8 ":
                    return {
                        frame: webP.substring(cursor, cursor + chunkLength),
                        hasAlpha: hasAlpha
                    };
                    
                case "ALPH":
                    hasAlpha = true;
                    break;
            }
            
            cursor += chunkLength;
            
            if ((chunkLength & 0x01) !== 0) {
                cursor++;
            }
        }
        
        throw new Error("Failed to find VP8 keyframe in WebP image, is this image mistakenly encoded in the Lossless WebP format?");
    }
    
    const 
        EBML_SIZE_UNKNOWN = -1,
        EBML_SIZE_UNKNOWN_5_BYTES = -2;
    
    function EBMLFloat32(value) {
        this.value = value;
    }
    
    function EBMLFloat64(value) {
        this.value = value;
    }
    
    function writeEBML(buffer, bufferFileOffset, ebml) {
        if (Array.isArray(ebml)) {
            for (let i = 0; i < ebml.length; i++) {
                writeEBML(buffer, bufferFileOffset, ebml[i]);
            }
        } else if (typeof ebml === "string") {
            buffer.writeString(ebml);
        } else if (ebml instanceof Uint8Array) {
            buffer.writeBytes(ebml);
        } else if (ebml.id){
            ebml.offset = buffer.pos + bufferFileOffset;
            
            buffer.writeUnsignedIntBE(ebml.id);
            
            if (Array.isArray(ebml.data)) {
                let
                    sizePos, dataBegin, dataEnd;
                
                if (ebml.size === EBML_SIZE_UNKNOWN) {
                    buffer.writeByte(0xFF);
                } else if (ebml.size === EBML_SIZE_UNKNOWN_5_BYTES) {
                    sizePos = buffer.pos;
                    
                    buffer.writeBytes([0x0F, 0xFF, 0xFF, 0xFF, 0xFF]);
                } else {
                    sizePos = buffer.pos;
                    
                    buffer.writeBytes([0, 0, 0, 0]);
                }
                
                dataBegin = buffer.pos;
                
                ebml.dataOffset = dataBegin + bufferFileOffset;
                writeEBML(buffer, bufferFileOffset, ebml.data);
                
                if (ebml.size !== EBML_SIZE_UNKNOWN && ebml.size !== EBML_SIZE_UNKNOWN_5_BYTES) {
                    dataEnd = buffer.pos;
                    
                    ebml.size = dataEnd - dataBegin;
                    
                    buffer.seek(sizePos);
                    buffer.writeEBMLVarIntWidth(ebml.size, 4);
                    
                    buffer.seek(dataEnd);
                }
            } else if (typeof ebml.data === "string") {
                buffer.writeEBMLVarInt(ebml.data.length);
                ebml.dataOffset = buffer.pos + bufferFileOffset;
                buffer.writeString(ebml.data);
            } else if (typeof ebml.data === "number") {
                if (!ebml.size) {
                    ebml.size = buffer.measureUnsignedInt(ebml.data);
                }
                
                buffer.writeEBMLVarInt(ebml.size);
                ebml.dataOffset = buffer.pos + bufferFileOffset;
                buffer.writeUnsignedIntBE(ebml.data, ebml.size);
            } else if (ebml.data instanceof EBMLFloat64) {
                buffer.writeEBMLVarInt(8);
                ebml.dataOffset = buffer.pos + bufferFileOffset;
                buffer.writeDoubleBE(ebml.data.value);
            } else if (ebml.data instanceof EBMLFloat32) {
                buffer.writeEBMLVarInt(4);
                ebml.dataOffset = buffer.pos + bufferFileOffset;
                buffer.writeFloatBE(ebml.data.value);
            } else if (ebml.data instanceof Uint8Array) {
                buffer.writeEBMLVarInt(ebml.data.byteLength);
                ebml.dataOffset = buffer.pos + bufferFileOffset;
                buffer.writeBytes(ebml.data);
            } else {
                throw new Error("Bad EBML datatype " + typeof ebml.data);
            }
        } else {
            throw new Error("Bad EBML datatype " + typeof ebml.data);
        }
    }
    let WebMWriter = function(ArrayBufferDataStream, BlobBuffer) {
        return function(options) {
            let
                MAX_CLUSTER_DURATION_MSEC = 5000,
                DEFAULT_TRACK_NUMBER = 1,
            
                writtenHeader = false,
                videoWidth = 0, videoHeight = 0,
    
                alphaBuffer = null,
                alphaBufferContext = null,
                alphaBufferData = null,
    
                clusterFrameBuffer = [],
                clusterStartTime = 0,
                clusterDuration = 0,
                
                optionDefaults = {
                    quality: 0.95,
                    
                    transparent: false,
                    alphaQuality: undefined,
                    
                    fileWriter: null,
                    fd: null,
                    
                    frameDuration: null,
                    frameRate: null,
                },
                
                seekPoints = {
                    Cues: {id: new Uint8Array([0x1C, 0x53, 0xBB, 0x6B]), positionEBML: null},
                    SegmentInfo: {id: new Uint8Array([0x15, 0x49, 0xA9, 0x66]), positionEBML: null},
                    Tracks: {id: new Uint8Array([0x16, 0x54, 0xAE, 0x6B]), positionEBML: null},
                },
                
                ebmlSegment,
                
                segmentDuration = {
                    "id": 0x4489,
                    "data": new EBMLFloat64(0)
                },
                
                seekHead,
                
                cues = [],
                
                blobBuffer = new BlobBuffer(options.fileWriter || options.fd);
    
            function fileOffsetToSegmentRelative(fileOffset) {
                return fileOffset - ebmlSegment.dataOffset;
            }
    
            function convertAlphaToGrayscaleImage(source) {
                if (alphaBuffer === null || alphaBuffer.width !== source.width || alphaBuffer.height !== source.height) {
                    alphaBuffer = document.createElement("canvas");
                    alphaBuffer.width = source.width;
                    alphaBuffer.height = source.height;
                    
                    alphaBufferContext = alphaBuffer.getContext("2d");
                    alphaBufferData = alphaBufferContext.createImageData(alphaBuffer.width, alphaBuffer.height);
                }
                
                let
                    sourceContext = source.getContext("2d"),
                    sourceData = sourceContext.getImageData(0, 0, source.width, source.height).data,
                    destData = alphaBufferData.data,
                    dstCursor = 0,
                    srcEnd = source.width * source.height * 4;
                
                for (let srcCursor = 3; srcCursor < srcEnd; srcCursor += 4) {
                    let
                        alpha = sourceData[srcCursor];
                    
                    destData[dstCursor++] = alpha;
                    destData[dstCursor++] = alpha;
                    destData[dstCursor++] = alpha;
                    destData[dstCursor++] = 255;
                }
                
                alphaBufferContext.putImageData(alphaBufferData, 0, 0);
                
                return alphaBuffer;
            }
            
            function createSeekHead() {
                let
                    seekPositionEBMLTemplate = {
                        "id": 0x53AC,
                        "size": 5,
                        "data": 0
                    },
                    
                    result = {
                        "id": 0x114D9B74,
                        "data": []
                    };
                
                for (let name in seekPoints) {
                    let
                        seekPoint = seekPoints[name];
                
                    seekPoint.positionEBML = Object.create(seekPositionEBMLTemplate);
                    
                    result.data.push({
                         "id": 0x4DBB,
                         "data": [
                              {
                                  "id": 0x53AB,
                                  "data": seekPoint.id
                              },
                              seekPoint.positionEBML
                         ]
                    });
                }
                
                return result;
            }
            
            function writeHeader() {
                seekHead = createSeekHead();
                
                let
                    ebmlHeader = {
                        "id": 0x1a45dfa3,
                        "data": [
                            { "id": 0x4286, "data": 1 },
                            { "id": 0x42f7, "data": 1 },
                            { "id": 0x42f2, "data": 4 },
                            { "id": 0x42f3, "data": 8 },
                            { "id": 0x4282, "data": "webm" },
                            { "id": 0x4287, "data": 2 },
                            { "id": 0x4285, "data": 2 }
                        ]
                    },
                    
                    segmentInfo = {
                        "id": 0x1549a966,
                        "data": [
                            { "id": 0x2ad7b1, "data": 1e6 },
                            { "id": 0x4d80, "data": "webm-writer-js" },
                            { "id": 0x5741, "data": "webm-writer-js" },
                            segmentDuration
                        ]
                    },
                    
                    videoProperties = [
                        { "id": 0xb0, "data": videoWidth },
                        { "id": 0xba, "data": videoHeight }
                    ];
                
                if (options.transparent) {
                    videoProperties.push({ "id": 0x53C0, "data": 1 });
                }
                
                let
                    tracks = {
                        "id": 0x1654ae6b,
                        "data": [
                            {
                                "id": 0xae,
                                "data": [
                                    { "id": 0xd7, "data": DEFAULT_TRACK_NUMBER },
                                    { "id": 0x73c5, "data": DEFAULT_TRACK_NUMBER },
                                    { "id": 0x9c, "data": 0 },
                                    { "id": 0x22b59c, "data": "und" },
                                    { "id": 0x86, "data": "V_VP8" },
                                    { "id": 0x258688, "data": "VP8" },
                                    { "id": 0x83, "data": 1 },
                                    { "id": 0xe0, "data": videoProperties }
                                ]
                            }
                        ]
                    };
                
                ebmlSegment = {
                    "id": 0x18538067,
                    "size": EBML_SIZE_UNKNOWN_5_BYTES,
                    "data": [ seekHead, segmentInfo, tracks ]
                };
                
                let
                    bufferStream = new ArrayBufferDataStream(256);
                    
                writeEBML(bufferStream, blobBuffer.pos, [ebmlHeader, ebmlSegment]);
                blobBuffer.write(bufferStream.getAsDataArray());
                
                seekPoints.SegmentInfo.positionEBML.data = fileOffsetToSegmentRelative(segmentInfo.offset);
                seekPoints.Tracks.positionEBML.data = fileOffsetToSegmentRelative(tracks.offset);
                
	            writtenHeader = true;
            }

            function createBlockGroupForTransparentKeyframe(keyframe) {
                let
                    block, blockAdditions,
                    
                    bufferStream = new ArrayBufferDataStream(1 + 2 + 1);
    
                if (!(keyframe.trackNumber > 0 && keyframe.trackNumber < 127)) {
                    throw new Error("TrackNumber must be > 0 and < 127");
                }
        
                bufferStream.writeEBMLVarInt(keyframe.trackNumber);
                bufferStream.writeU16BE(keyframe.timecode);
                bufferStream.writeByte(0);
    
                block = {
                    "id": 0xA1,
                    "data": [
                        bufferStream.getAsDataArray(),
                        keyframe.frame
                    ]
                };
    
                blockAdditions = {
                    "id": 0x75A1,
                    "data": [
                        {
                            "id": 0xA6,
                            "data": [
                                { "id": 0xEE, "data": 1 },
                                { "id": 0xA5, "data": keyframe.alpha }
                            ]
                        }
                    ]
                };
    
                return {
                    "id": 0xA0,
                    "data": [ block, blockAdditions ]
                };
            }
            
            function createSimpleBlockForKeyframe(keyframe) {
                let
                    bufferStream = new ArrayBufferDataStream(1 + 2 + 1);
                
                if (!(keyframe.trackNumber > 0 && keyframe.trackNumber < 127)) {
                    throw new Error("TrackNumber must be > 0 and < 127");
                }
    
                bufferStream.writeEBMLVarInt(keyframe.trackNumber);
                bufferStream.writeU16BE(keyframe.timecode);
                
                bufferStream.writeByte(
                    1 << 7
                );
                
                return {
                    "id": 0xA3,
                    "data": [
                         bufferStream.getAsDataArray(),
                         keyframe.frame
                    ]
                };
            }
    
            function createContainerForKeyframe(keyframe) {
                if (keyframe.alpha) {
                    return createBlockGroupForTransparentKeyframe(keyframe);
                }
                
                return createSimpleBlockForKeyframe(keyframe);
            }
        
            function createCluster(cluster) {
                return {
                    "id": 0x1f43b675,
                    "data": [
                         { "id": 0xe7, "data": Math.round(cluster.timecode) }
                    ]
                };
            }
            
            function addCuePoint(trackIndex, clusterTime, clusterFileOffset) {
                cues.push({
                    "id": 0xBB,
                    "data": [
                         { "id": 0xB3, "data": clusterTime },
                         {
                             "id": 0xB7,
                             "data": [
                                  { "id": 0xF7, "data": trackIndex },
                                  { "id": 0xF1, "data": fileOffsetToSegmentRelative(clusterFileOffset) }
                             ]
                         }
                    ]
                });
            }
            
            function writeCues() {
                let
                    ebml = {
                        "id": 0x1C53BB6B,
                        "data": cues
                    },
                    
                    cuesBuffer = new ArrayBufferDataStream(16 + cues.length * 32);
                
                writeEBML(cuesBuffer, blobBuffer.pos, ebml);
                blobBuffer.write(cuesBuffer.getAsDataArray());
                
                seekPoints.Cues.positionEBML.data = fileOffsetToSegmentRelative(ebml.offset);
            }
            
            function flushClusterFrameBuffer() {
                if (clusterFrameBuffer.length === 0) {
                    return;
                }
    
                let
                    rawImageSize = 0;
                
                for (let i = 0; i < clusterFrameBuffer.length; i++) {
                    rawImageSize += clusterFrameBuffer[i].frame.length + (clusterFrameBuffer[i].alpha ? clusterFrameBuffer[i].alpha.length : 0);
                }
                
                let
                    buffer = new ArrayBufferDataStream(rawImageSize + clusterFrameBuffer.length * 64),
    
                    cluster = createCluster({
                        timecode: Math.round(clusterStartTime),
                    });
                
                for (let i = 0; i < clusterFrameBuffer.length; i++) {
                    cluster.data.push(createContainerForKeyframe(clusterFrameBuffer[i]));
                }
                
                writeEBML(buffer, blobBuffer.pos, cluster);
                blobBuffer.write(buffer.getAsDataArray());
                
                addCuePoint(DEFAULT_TRACK_NUMBER, Math.round(clusterStartTime), cluster.offset);
                
                clusterFrameBuffer = [];
                clusterStartTime += clusterDuration;
                clusterDuration = 0;
            }
            
            function validateOptions() {
                if (!options.frameDuration) {
                    if (options.frameRate) {
                        options.frameDuration = 1000 / options.frameRate;
                    } else {
                        throw new Error("Missing required frameDuration or frameRate setting");
                    }
                }
                
                options.quality = Math.max(Math.min(options.quality, 0.99999), 0);
                
                if (options.alphaQuality === undefined) {
                    options.alphaQuality = options.quality;
                } else {
                    options.alphaQuality = Math.max(Math.min(options.alphaQuality, 0.99999), 0);
                }
            }
    
            function addFrameToCluster(frame) {
                frame.trackNumber = DEFAULT_TRACK_NUMBER;
                
                frame.timecode = Math.round(clusterDuration);
    
                clusterFrameBuffer.push(frame);
                
                clusterDuration += frame.duration;
                
                if (clusterDuration >= MAX_CLUSTER_DURATION_MSEC) {
                    flushClusterFrameBuffer();
                }
            }
            
            function rewriteSeekHead() {
                let
                    seekHeadBuffer = new ArrayBufferDataStream(seekHead.size),
                    oldPos = blobBuffer.pos;
                
                writeEBML(seekHeadBuffer, seekHead.dataOffset, seekHead.data);
                
                blobBuffer.seek(seekHead.dataOffset);
                blobBuffer.write(seekHeadBuffer.getAsDataArray());
    
                blobBuffer.seek(oldPos);
            }
            
            function rewriteDuration() {
                let
                    buffer = new ArrayBufferDataStream(8),
                    oldPos = blobBuffer.pos;
                
                buffer.writeDoubleBE(clusterStartTime);
                
                blobBuffer.seek(segmentDuration.dataOffset);
                blobBuffer.write(buffer.getAsDataArray());
        
                blobBuffer.seek(oldPos);
            }
    
            function rewriteSegmentLength() {
                let
                    buffer = new ArrayBufferDataStream(10),
                    oldPos = blobBuffer.pos;
    
                buffer.writeUnsignedIntBE(ebmlSegment.id);
                buffer.writeEBMLVarIntWidth(blobBuffer.pos - ebmlSegment.dataOffset, 5);
                
                blobBuffer.seek(ebmlSegment.offset);
                blobBuffer.write(buffer.getAsDataArray());
        
                blobBuffer.seek(oldPos);
            }

            this.addFrame = function(frame, alpha, overrideFrameDuration) {
                if (!writtenHeader) {
                    videoWidth = frame.width || 0;
                    videoHeight = frame.height || 0;
    
                    writeHeader();
                }
    
                let
                    keyframe = extractKeyframeFromWebP(renderAsWebP(frame, options.quality)),
                    frameDuration, frameAlpha = null;
                
                if (overrideFrameDuration) {
                    frameDuration = overrideFrameDuration;
                } else if (typeof alpha == "number") {
                    frameDuration = alpha;
                } else {
                    frameDuration = options.frameDuration;
                }
                
                if (options.transparent) {
                    if (alpha instanceof HTMLCanvasElement || typeof alpha === "string") {
                        frameAlpha = alpha;
                    } else if (keyframe.hasAlpha) {
                        frameAlpha = convertAlphaToGrayscaleImage(frame);
                    }
                }
                
                addFrameToCluster({
                    frame: keyframe.frame,
                    duration: frameDuration,
                    alpha: frameAlpha ? extractKeyframeFromWebP(renderAsWebP(frameAlpha, options.alphaQuality)).frame : null
                });
            };
            
            this.complete = function() {
            	if (!writtenHeader) {
		            writeHeader();
	            }
	            
                flushClusterFrameBuffer();
                writeCues();
                
                rewriteSeekHead();
                rewriteDuration();
                rewriteSegmentLength();
                
                return blobBuffer.complete('video/webm');
            };
            
            this.getWrittenSize = function() {
                return blobBuffer.length;
            };
    
            options = extend(optionDefaults, options || {});
            validateOptions();
        };
    };
    
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	    module.exports = WebMWriter;
    } else {
	    window.WebMWriter = WebMWriter(window.ArrayBufferDataStream, window.BlobBuffer);
    }
})();
