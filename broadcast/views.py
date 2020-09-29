from django.shortcuts import render

# Create your views here.

def index(request):
    
    return render(request, 'index.html')

def index_cc( request,classcode):
    cc = classcode
    ctx = {'cc':cc}
    return render(request, 'index.html',ctx)
    
def broadcast( request,classcode):
    cc = classcode
    ctx = {'cc':cc}
    
    return render(request, 'teacher.html',ctx)

def watch( request,classcode):
    cc = classcode
    ctx = {'cc':cc}
    return render(request, 'student.html',ctx)

# def room(request, room_name):
#     return render(request, 'room.html', {
#         'room_name': room_name
#     })