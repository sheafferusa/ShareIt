var ui = (function(module){
var _priv = module._priv = module._priv || {}

_priv.filetype2className = function(filetype)
{
  filetype = filetype.split('/');

  switch(filetype[0])
  {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
  }

  // Unknown file type, return generic file
  return 'file';
}

_priv.spanedCell = function(table)
//Creates a cell that span over all the columns of a table
{
  var td = document.createElement('TD');
  td.colSpan = table.getElementsByTagName('thead')[0].rows[0].cells.length;
  td.align = 'center';

  return td;
}

//_priv.classEscape = function(text)
//{
//  return text.replace(/\./g, '_').replace(/ /g, '__').replace(/\//g, '___');
//}

_priv.rowFolder = function(tbody, prevPath, path)
{
  if(prevPath == path)
    return prevPath;

  // Folder row
  var tr = document.createElement('TR');
//  tr.id = _priv.classEscape(path);
  tr.setAttribute('data-tt-id',path);

  var td = document.createElement('TD');
  td.colSpan = 2;
  tr.appendChild(td);

  var path_tokens = path.split('/');

  // Folder name & icon
  var span = document.createElement('SPAN');
  span.className = 'folder';
  span.appendChild(document.createTextNode(path_tokens.slice(-1)));
  td.appendChild(span);

  var path_tokens = path_tokens.slice(0, -1);
  if(path_tokens.length)
//    tr.setAttribute('class', 'child-of-'+_priv.classEscape(path_tokens.join('/')));
    tr.setAttribute('data-tt-parent-id',path_tokens.join('/'));

  tbody.appendChild(tr);

  return path;
}


_priv.FilesTable =
{
  dirty: true,

  update: function(fileslist)
  {
    // Remove old table and add new empty one
    while(this.tbody.firstChild)
      this.tbody.removeChild(this.tbody.firstChild);

    if(fileslist.length)
    {
      fileslist.sort(function(a, b)
      {
        function strcmp(str1, str2)
        {
          return ((str1 == str2) ? 0 : ((str1 > str2) ? 1 : -1));
        }

        var result = strcmp(a.sharedpoint, b.sharedpoint);
        if(result)
          return result;

        var result = strcmp(a.path, b.path);
        if(result)
          return result;

        var result = strcmp(a.file ? a.file.name : a.name, b.file ? b.file.name : b.name);
        if(result)
          return result;
      });

      this.updateFiles(fileslist);

      $(this.tbody.parentNode).treetable(
      {
        expandable: true,
        initialState: 'expanded'
      });
    }
    else
    {
      var tr = document.createElement('TR');
      tr.appendChild(this.noFilesCaption);

      this.tbody.appendChild(tr);
    }
  }
}

return module
})(ui || {})