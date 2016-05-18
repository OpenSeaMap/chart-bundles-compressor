FROM python:3-onbuild
CMD [ "python", "./OpenSeaMap_BundleCompressor.py" ]
VOLUME /dataOut
VOLUME /dataTmp
