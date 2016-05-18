import logging
logging.basicConfig(format='%(levelname)s: %(message)s', level=logging.DEBUG)

import io
import os
from lxml import etree

ftpProtocol = 'ftp://'
ftpRoot = 'ftp5.gwdg.de'
ftpPath = '/pub/misc/openstreetmap/openseamap/chartbundles/kap/'
ftpBase = ftpRoot + ftpPath

tmpPath = '/dataTmp/'
outPath = '/dataOut/'
outName = 'bundles.xml'

if not os.path.exists(tmpPath):
    os.makedirs(tmpPath)
if not os.path.exists(outPath):
    os.makedirs(outPath)

from ftplib import FTP
logging.info('Connecting to ftp "{}" ..'.format(ftpRoot))
ftp=FTP(ftpRoot)
ftp.login()
ftp.cwd(ftpPath)

filelist = ftp.nlst()
pairs=[]

logging.info('Connection OK. Number of files: {}'.format(len(filelist)))
logging.debug('Filelist: {}'.format(filelist))

def getBaseName(str):
    return str.rsplit('.', 1)[0]

for pos in range(len(filelist)-1):
	str1 = filelist[pos].rsplit('.', 1)
	str2 = filelist[pos+1].rsplit('.', 1)

	if str1[0] == str2[0]:
		pairs.append({
			'base': str1[0],
			'extensions': [str1[1], str2[1]]
			})

logging.info('Detected pairs of files: {}'.format(len(pairs)))
logging.debug('pairs of files: {}'.format(pairs))

import io
import lxml.etree as etree

import urllib.request
root = etree.Element("bundles")

for pair in pairs:
	filename = pair['base'] + '.xml'
	ftpName = ftpProtocol + ftpBase + filename
	tmpFileName = tmpPath +filename

	outFile=open(tmpFileName, mode='wb')
	logging.debug('Loading "{}"'.format(filename))
	ftp.retrbinary('RETR {}'.format(filename),  outFile.write)
	outFile.close()

	tree = etree.parse(tmpFileName)
	logging.debug('root: {}'.format(tree.getroot()))

	subroot = tree.getroot()
	#root.append(subroot)
	newChild = etree.SubElement(root, subroot.tag, subroot.attrib)
    


tree = etree.ElementTree(root)
tree.write(outPath + outName, encoding='utf-8', xml_declaration=1, pretty_print=True)
